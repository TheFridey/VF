import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MilitaryBranch, Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { ConnectionStatus, ConnectionType } from '../common/enums/connection.enum';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { PushNotificationService } from '../notifications/push.service';
import { canonicalTheatre, deploymentsMatch, unitSimilarity } from './unit-matcher';

const BROTHERS_CACHE_TTL = 300;

const BROTHER_USER_INCLUDE = {
  profile: true,
  veteranDetails: {
    include: {
      servicePeriods: true,
    },
  },
} satisfies Prisma.UserInclude;

type BrotherUser = Prisma.UserGetPayload<{
  include: typeof BROTHER_USER_INCLUDE;
}>;

type ServicePeriodRecord = NonNullable<BrotherUser['veteranDetails']>['servicePeriods'][number];
type VeteranDetailsRecord = NonNullable<BrotherUser['veteranDetails']>;
type ScoredBrotherUser = BrotherUser & { overlapScore: number };

type PeriodMatchEvidence = {
  overlapMonths: number;
  timePoints: number;
  unitPoints: number;
  stationPoints: number;
  totalPoints: number;
  yearRange: string;
  unitLabel: string | null;
  stationLabel: string | null;
};

function isVerifiedVeteran(role: PrismaUserRole): boolean {
  return role === PrismaUserRole.VETERAN_VERIFIED || role === PrismaUserRole.VETERAN_MEMBER;
}

function normaliseComparisonLabel(value?: string | null): string {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ') ?? '';
}

function humaniseLabel(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function chooseDisplayLabel(primary?: string | null, secondary?: string | null): string | null {
  const candidates = [primary, secondary]
    .filter((value): value is string => !!value && !!value.trim())
    .sort((left, right) => right.length - left.length);

  return candidates[0]?.trim() ?? null;
}

function buildYearRange(startDate: Date, endDate: Date): string {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  return startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
}

@Injectable()
export class BrothersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private pushService: PushNotificationService,
  ) {}

  async getConnectionRequests(userId: string) {
    const requests = await this.prisma.connection.findMany({
      where: {
        connectionType: ConnectionType.BROTHERS_IN_ARMS,
        status: ConnectionStatus.PENDING,
        user2Id: userId,
      },
      include: {
        user1: {
          select: {
            id: true,
            profile: true,
            veteranDetails: {
              include: { servicePeriods: true },
            },
          },
        },
      },
    });

    const blockedCounterpartIds = await this.getBlockedCounterpartIds(
      userId,
      requests.map((request) => request.user1Id),
    );

    return {
      requests: requests
        .filter((request) => !blockedCounterpartIds.has(request.user1Id))
        .map((request) => ({
          id: request.id,
          overlapScore: request.overlapScore,
          createdAt: request.createdAt,
          from: {
            id: request.user1.id,
            displayName: request.user1.profile?.displayName,
            profileImageUrl: request.user1.profile?.profileImageUrl,
            branch: request.user1.veteranDetails?.branch,
            rank: request.user1.veteranDetails?.rank,
          },
        })),
    };
  }

  async sendConnectionRequest(userId: string, targetUserId: string, message?: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot connect with yourself');
    }

    const [user, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: BROTHER_USER_INCLUDE,
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        include: BROTHER_USER_INCLUDE,
      }),
    ]);

    if (!user || !target) {
      throw new NotFoundException('User not found');
    }

    if (await this.isBlockedBetween(userId, targetUserId)) {
      throw new ForbiddenException('You cannot connect with a user who is blocked');
    }

    if (!isVerifiedVeteran(user.role) || !isVerifiedVeteran(target.role)) {
      throw new ForbiddenException('Both users must be verified veterans');
    }

    const existingMatch = await this.prisma.connection.findFirst({
      where: {
        connectionType: ConnectionType.BROTHERS_IN_ARMS,
        OR: [
          { user1Id: userId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: userId },
        ],
      },
    });

    if (existingMatch) {
      throw new BadRequestException('Connection already exists or pending');
    }

    const overlapScore = this.calculateOverlapScore(user, target);

    const match = await this.prisma.connection.create({
      data: {
        user1Id: userId,
        user2Id: targetUserId,
        connectionType: ConnectionType.BROTHERS_IN_ARMS,
        status: ConnectionStatus.PENDING,
        overlapScore,
      },
    });

    const senderName = user.profile?.displayName?.trim() || 'Another veteran';

    void this.pushService
      .notifyConnectionRequest(targetUserId, senderName, match.id)
      .catch(() => undefined);

    return { success: true, connectionId: match.id };
  }

  async respondToRequest(userId: string, requestId: string, accept: boolean) {
    const match = await this.prisma.connection.findUnique({
      where: { id: requestId },
    });

    if (!match) {
      throw new NotFoundException('Request not found');
    }

    if (match.user2Id !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (match.status !== ConnectionStatus.PENDING) {
      throw new BadRequestException('Request already processed');
    }

    if (accept) {
      const updatedMatch = await this.prisma.connection.update({
        where: { id: requestId },
        data: { status: ConnectionStatus.ACTIVE },
      });

      const accepter = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          profile: { select: { displayName: true } },
        },
      });

      const accepterName = accepter?.profile?.displayName?.trim() || 'A veteran';

      void this.pushService
        .notifyNewConnection(updatedMatch.user1Id, accepterName, updatedMatch.id)
        .catch(() => undefined);

      return { success: true, accepted: true };
    }

    await this.prisma.connection.delete({
      where: { id: requestId },
    });

    return { success: true, accepted: false };
  }

  async searchBrothers(userId: string, filters?: Record<string, unknown>) {
    const cacheKey = this.buildSearchCacheKey(userId, filters);
    const cached = await this.redis.cacheGet<ReturnType<typeof this.formatBrotherCandidate>[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        veteranDetails: {
          include: { servicePeriods: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!isVerifiedVeteran(user.role)) {
      throw new ForbiddenException('Only verified veterans can use Brothers in Arms');
    }

    const candidates = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        role: { in: [PrismaUserRole.VETERAN_VERIFIED, PrismaUserRole.VETERAN_MEMBER] },
        veteranDetails: {
          isNot: null,
        },
      },
      include: BROTHER_USER_INCLUDE,
      take: 50,
    });

    const blockedCounterpartIds = await this.getBlockedCounterpartIds(
      userId,
      candidates.map((candidate) => candidate.id),
    );

    const requestingUser = user as BrotherUser;

    const scoredCandidates: ScoredBrotherUser[] = candidates
      .filter((candidate) => !blockedCounterpartIds.has(candidate.id))
      .map((candidate) => ({
        ...candidate,
        overlapScore: this.calculateOverlapScore(requestingUser, candidate),
      }))
      .sort((left, right) => right.overlapScore - left.overlapScore);

    const result = scoredCandidates.map((candidate) => this.formatBrotherCandidate(candidate, requestingUser));

    this.redis.cacheSet(cacheKey, result, BROTHERS_CACHE_TTL).catch(() => undefined);

    return result;
  }

  async connectWithBrother(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot connect with yourself');
    }

    const [user, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: BROTHER_USER_INCLUDE,
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        include: BROTHER_USER_INCLUDE,
      }),
    ]);

    if (!user || !target) {
      throw new NotFoundException('User not found');
    }

    if (await this.isBlockedBetween(userId, targetUserId)) {
      throw new ForbiddenException('You cannot connect with a user who is blocked');
    }

    if (!isVerifiedVeteran(user.role) || !isVerifiedVeteran(target.role)) {
      throw new ForbiddenException('Both users must be verified veterans');
    }

    const existingMatch = await this.prisma.connection.findFirst({
      where: {
        connectionType: ConnectionType.BROTHERS_IN_ARMS,
        OR: [
          { user1Id: userId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: userId },
        ],
      },
    });

    if (existingMatch) {
      throw new BadRequestException('Connection already exists');
    }

    const overlapScore = this.calculateOverlapScore(user, target);

    return this.prisma.connection.create({
      data: {
        user1Id: userId < targetUserId ? userId : targetUserId,
        user2Id: userId < targetUserId ? targetUserId : userId,
        connectionType: ConnectionType.BROTHERS_IN_ARMS,
        status: ConnectionStatus.ACTIVE,
        overlapScore,
      },
    });
  }

  async getBrotherConnections(userId: string) {
    const matches = await this.prisma.connection.findMany({
      where: {
        connectionType: ConnectionType.BROTHERS_IN_ARMS,
        status: ConnectionStatus.ACTIVE,
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: {
          select: {
            id: true,
            profile: true,
            veteranDetails: {
              include: { servicePeriods: true },
            },
          },
        },
        user2: {
          select: {
            id: true,
            profile: true,
            veteranDetails: {
              include: { servicePeriods: true },
            },
          },
        },
      },
    });

    return matches.map((match) => {
      const otherUser = match.user1Id === userId ? match.user2 : match.user1;

      return {
        connectionId: match.id,
        overlapScore: match.overlapScore,
        connectedAt: match.createdAt,
        user: {
          id: otherUser.id,
          displayName: otherUser.profile?.displayName,
          profileImageUrl: otherUser.profile?.profileImageUrl,
          branch: otherUser.veteranDetails?.branch,
          rank: otherUser.veteranDetails?.rank,
        },
      };
    });
  }

  private calculateOverlapScore(user1: BrotherUser, user2: BrotherUser): number {
    if (!user1.veteranDetails || !user2.veteranDetails) {
      return 0;
    }

    const veteranDetails1 = user1.veteranDetails;
    const veteranDetails2 = user2.veteranDetails;
    let score = 0;

    if (veteranDetails1.branch && veteranDetails1.branch === veteranDetails2.branch) {
      score += 12;
    }

    const regimentSimilarity = this.matchSimilarity(veteranDetails1.regiment, veteranDetails2.regiment);
    if (regimentSimilarity >= 0.85) {
      score += 12;
    } else if (regimentSimilarity >= 0.7) {
      score += 6;
    }

    const sharedTheatres = this.getSharedDeploymentTheatres(veteranDetails1.deployments, veteranDetails2.deployments);
    if (sharedTheatres.length > 0) {
      score += Math.min(16, 12 + (sharedTheatres.length - 1) * 4);
    }

    const sharedLegacyStations = this.getSharedLabels(
      veteranDetails1.dutyStations,
      veteranDetails2.dutyStations,
      0.75,
    );
    if (sharedLegacyStations.length > 0) {
      score += Math.min(10, 8 + (sharedLegacyStations.length - 1) * 2);
    }

    const bestPeriodMatch = this.getBestPeriodMatch(
      veteranDetails1.servicePeriods,
      veteranDetails2.servicePeriods,
    );

    if (bestPeriodMatch) {
      score += bestPeriodMatch.timePoints + bestPeriodMatch.unitPoints + bestPeriodMatch.stationPoints;
    }

    return Math.min(score, 100);
  }

  private getBestPeriodMatch(
    periods1: ServicePeriodRecord[],
    periods2: ServicePeriodRecord[],
  ): PeriodMatchEvidence | null {
    let bestMatch: PeriodMatchEvidence | null = null;

    for (const period1 of periods1) {
      for (const period2 of periods2) {
        if (!this.periodsOverlap(period1, period2)) {
          continue;
        }

        const overlapMonths = this.overlapDurationMonths(period1, period2);
        const timePoints = Math.min(20, overlapMonths * 2);

        const unitSimilarityScore = this.matchSimilarity(period1.unit, period2.unit);
        const unitPoints = unitSimilarityScore >= 0.85 ? 28 : unitSimilarityScore >= 0.7 ? 16 : 0;

        const stationSimilarityScore = this.matchSimilarity(period1.dutyStation, period2.dutyStation);
        const stationPoints = stationSimilarityScore >= 0.75 ? 8 : 0;

        const startDate = new Date(Math.max(period1.startDate.getTime(), period2.startDate.getTime()));
        const endDate = new Date(Math.min(this.getPeriodEnd(period1).getTime(), this.getPeriodEnd(period2).getTime()));

        const evidence: PeriodMatchEvidence = {
          overlapMonths,
          timePoints,
          unitPoints,
          stationPoints,
          totalPoints: timePoints + unitPoints + stationPoints,
          yearRange: buildYearRange(startDate, endDate),
          unitLabel: chooseDisplayLabel(period1.unit, period2.unit),
          stationLabel: chooseDisplayLabel(period1.dutyStation, period2.dutyStation),
        };

        if (
          !bestMatch
          || evidence.totalPoints > bestMatch.totalPoints
          || (evidence.totalPoints === bestMatch.totalPoints && evidence.overlapMonths > bestMatch.overlapMonths)
        ) {
          bestMatch = evidence;
        }
      }
    }

    return bestMatch;
  }

  private overlapDurationMonths(period1: ServicePeriodRecord, period2: ServicePeriodRecord): number {
    const overlapStart = Math.max(period1.startDate.getTime(), period2.startDate.getTime());
    const overlapEnd = Math.min(this.getPeriodEnd(period1).getTime(), this.getPeriodEnd(period2).getTime());

    if (overlapEnd < overlapStart) {
      return 0;
    }

    const approximateMonths = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24 * 30));

    return Math.max(1, approximateMonths);
  }

  private getOverlapReasons(user1: BrotherUser, candidate: BrotherUser): string[] {
    if (!user1.veteranDetails || !candidate.veteranDetails) {
      return [];
    }

    const reasons: string[] = [];
    const veteranDetails1 = user1.veteranDetails;
    const veteranDetails2 = candidate.veteranDetails;

    if (veteranDetails1.branch && veteranDetails1.branch === veteranDetails2.branch) {
      reasons.push(`Both served in the ${this.branchLabel(veteranDetails1.branch)}`);
    }

    const regimentSimilarity = this.matchSimilarity(veteranDetails1.regiment, veteranDetails2.regiment);
    if (regimentSimilarity >= 0.85) {
      const label = chooseDisplayLabel(veteranDetails1.regiment, veteranDetails2.regiment);
      if (label) {
        reasons.push(`Same regiment: ${humaniseLabel(label)}`);
      }
    }

    const bestPeriodMatch = this.getBestPeriodMatch(
      veteranDetails1.servicePeriods,
      veteranDetails2.servicePeriods,
    );

    if (bestPeriodMatch) {
      reasons.push(`Overlapping service ${bestPeriodMatch.yearRange}`);

      if (bestPeriodMatch.unitLabel) {
        reasons.push(`Same unit: ${humaniseLabel(bestPeriodMatch.unitLabel)}`);
      }

      if (bestPeriodMatch.stationLabel) {
        reasons.push(`Same station: ${humaniseLabel(bestPeriodMatch.stationLabel)}`);
      }
    }

    for (const theatre of this.getSharedDeploymentTheatres(veteranDetails1.deployments, veteranDetails2.deployments)) {
      reasons.push(`Both deployed to ${theatre}`);
    }

    return [...new Set(reasons)].slice(0, 4);
  }

  private branchLabel(branch: MilitaryBranch): string {
    const labels: Record<MilitaryBranch, string> = {
      ARMY: 'Army',
      NAVY: 'Navy',
      AIR_FORCE: 'Air Force',
      MARINE_CORPS: 'Marine Corps',
      COAST_GUARD: 'Coast Guard',
      SPACE_FORCE: 'Space Force',
      NATIONAL_GUARD: 'National Guard',
      BRITISH_ARMY: 'British Army',
      ROYAL_NAVY: 'Royal Navy',
      ROYAL_AIR_FORCE: 'Royal Air Force',
      ROYAL_MARINES: 'Royal Marines',
      RESERVE_FORCES: 'Reserve Forces',
      TERRITORIAL_ARMY: 'Territorial Army',
      OTHER: 'Armed Forces',
    };

    return labels[branch] || branch;
  }

  private periodsOverlap(period1: ServicePeriodRecord, period2: ServicePeriodRecord): boolean {
    return period1.startDate <= this.getPeriodEnd(period2) && period2.startDate <= this.getPeriodEnd(period1);
  }

  private formatBrotherCandidate(candidate: ScoredBrotherUser, requestingUser?: BrotherUser) {
    const overlappingPeriods = candidate.veteranDetails
      ? this.getDisplayPeriods(candidate, requestingUser)
      : [];

    return {
      id: candidate.id,
      displayName: candidate.profile?.displayName || 'Unknown',
      bio: candidate.profile?.bio || null,
      profileImageUrl: candidate.profile?.profileImageUrl || null,
      location: candidate.profile?.location || null,
      overlapScore: candidate.overlapScore / 100,
      overlapReasons: requestingUser ? this.getOverlapReasons(requestingUser, candidate) : [],
      veteranInfo: candidate.veteranDetails ? {
        branch: candidate.veteranDetails.branch,
        rank: candidate.veteranDetails.rank,
        regiment: candidate.veteranDetails.regiment || null,
        isVerified: true,
      } : null,
      overlappingPeriods,
    };
  }

  private getDisplayPeriods(candidate: BrotherUser, requestingUser?: BrotherUser) {
    const periods = candidate.veteranDetails?.servicePeriods || [];

    const visiblePeriods = requestingUser?.veteranDetails
      ? periods.filter((candidatePeriod) =>
        requestingUser.veteranDetails!.servicePeriods.some((requestingPeriod) =>
          this.periodsOverlap(candidatePeriod, requestingPeriod),
        ))
      : periods;

    return visiblePeriods.slice(0, 3).map((period) => ({
      branch: candidate.veteranDetails?.branch,
      dateRange: `${period.startDate.getFullYear()}${period.endDate ? `-${period.endDate.getFullYear()}` : '-present'}`,
      location: period.dutyStation || period.unit || null,
    }));
  }

  private getPeriodEnd(period: ServicePeriodRecord): Date {
    return period.endDate ?? new Date();
  }

  private matchSimilarity(left?: string | null, right?: string | null): number {
    if (!left || !right) {
      return 0;
    }

    return unitSimilarity(left, right);
  }

  private getSharedDeploymentTheatres(deployments1: string[], deployments2: string[]): string[] {
    const matchedTheatres = new Set<string>();

    for (const deployment1 of deployments1) {
      for (const deployment2 of deployments2) {
        if (deploymentsMatch(deployment1, deployment2)) {
          matchedTheatres.add(canonicalTheatre(deployment1));
        }
      }
    }

    return [...matchedTheatres];
  }

  private getSharedLabels(labels1: string[], labels2: string[], threshold: number): string[] {
    const matchedLabels = new Set<string>();

    for (const label1 of labels1) {
      for (const label2 of labels2) {
        if (unitSimilarity(label1, label2) >= threshold) {
          matchedLabels.add(humaniseLabel(chooseDisplayLabel(label1, label2) || label1));
          break;
        }
      }
    }

    return [...matchedLabels];
  }

  private buildSearchCacheKey(userId: string, filters?: Record<string, unknown>) {
    if (!filters || Object.keys(filters).length === 0) {
      return `brothers:search:${userId}`;
    }

    const serialisedFilters = Object.keys(filters)
      .sort()
      .map((key) => `${key}:${JSON.stringify(filters[key])}`)
      .join('|');

    return `brothers:search:${userId}:${serialisedFilters}`;
  }

  private async isBlockedBetween(userId: string, otherUserId: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { blockerId: userId, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: userId },
        ],
      },
      select: { id: true },
    });

    return !!block;
  }

  private async getBlockedCounterpartIds(userId: string, candidateUserIds?: string[]) {
    const blocks = await this.prisma.block.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            blockerId: userId,
            ...(candidateUserIds?.length ? { blockedId: { in: candidateUserIds } } : {}),
          },
          {
            blockedId: userId,
            ...(candidateUserIds?.length ? { blockerId: { in: candidateUserIds } } : {}),
          },
        ],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    });

    return new Set(
      blocks.map((block) => (block.blockerId === userId ? block.blockedId : block.blockerId)),
    );
  }
}
