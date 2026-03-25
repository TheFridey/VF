import { unitSimilarity, deploymentsMatch, canonicalTheatre } from './unit-matcher';
import { UserRole } from '../common/enums/user-role.enum';
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { PushNotificationService } from '../notifications/push.service';
import { MilitaryBranch } from '@prisma/client';
import { ConnectionType, ConnectionStatus } from '../common/enums/connection.enum';

// Brothers search results are cached per user for 5 minutes.
// Invalidated when the user updates their veteran details or a new veteran
// is verified (via cache key expiry rather than active invalidation —
// 5 min staleness is acceptable for a matching feed).
const BROTHERS_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class BrothersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private pushService: PushNotificationService,
  ) {}

  async getConnectionRequests(userId: string) {
    // Get pending connection requests (matches in PENDING status where user is user2)
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
        .filter((req) => !blockedCounterpartIds.has(req.user1Id))
        .map((req) => ({
        id: req.id,
        overlapScore: req.overlapScore,
        createdAt: req.createdAt,
        from: {
          id: req.user1.id,
          displayName: req.user1.profile?.displayName,
          profileImageUrl: req.user1.profile?.profileImageUrl,
          branch: req.user1.veteranDetails?.branch,
          rank: req.user1.veteranDetails?.rank,
        },
        })),
    };
  }

  async sendConnectionRequest(userId: string, targetUserId: string, message?: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot connect with yourself');
    }

    // Check both are verified veterans
    const [user, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { veteranDetails: true, profile: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        include: { veteranDetails: true, profile: true },
      }),
    ]);

    if (!user || !target) throw new NotFoundException('User not found');

    if (await this.isBlockedBetween(userId, targetUserId)) {
      throw new ForbiddenException('You cannot connect with a user who is blocked');
    }

    const isUserVerified = user.role === UserRole.VETERAN_VERIFIED || user.role === UserRole.VETERAN_MEMBER;
    const isTargetVerified = target.role === UserRole.VETERAN_VERIFIED || target.role === UserRole.VETERAN_MEMBER;
    if (!isUserVerified || !isTargetVerified) {
      throw new ForbiddenException('Both users must be verified veterans');
    }

    // Check if connection already exists
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

    // Calculate overlap score
    const overlapScore = this.calculateOverlapScore(user, target);

    // Create pending match (user1 is the sender)
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

    if (!match) throw new NotFoundException('Request not found');
    if (match.user2Id !== userId) throw new ForbiddenException('Not authorized');
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
    } else {
      await this.prisma.connection.delete({
        where: { id: requestId },
      });
      return { success: true, accepted: false };
    }
  }

  async searchBrothers(userId: string, filters?: Record<string, unknown>) {
    // ── Cache check ──────────────────────────────────────────────────────────
    // Brothers search is expensive: loads all verified veterans with service
    // periods + calculates fuzzy unit overlap scores.  Cache per user for 5 min.
    const cacheKey = `brothers:search:${userId}`;
    const cached = await this.redis.cacheGet<ReturnType<typeof this.formatBrotherCandidate>[]>(cacheKey);
    if (cached) return cached;

    // Verify user is a verified veteran
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        veteranDetails: {
          include: { servicePeriods: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    
    if (user.role !== UserRole.VETERAN_VERIFIED && user.role !== UserRole.VETERAN_MEMBER) {
      throw new ForbiddenException('Only verified veterans can use Brothers in Arms');
    }

    // Find other verified veterans with overlapping service
    const candidates = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        role: { in: [UserRole.VETERAN_VERIFIED, UserRole.VETERAN_MEMBER] },
        veteranDetails: {
          isNot: null,
        },
      },
      include: {
        profile: true,
        veteranDetails: {
          include: { servicePeriods: true },
        },
      },
      take: 50,
    });

    const blockedCounterpartIds = await this.getBlockedCounterpartIds(
      userId,
      candidates.map((candidate) => candidate.id),
    );

    // Calculate overlap scores — keep ALL candidates, sort by score descending.
    // Users with score=0 (no detected overlap) show as "Other Veterans" in the UI.
    const scoredCandidates = candidates
      .filter((candidate) => !blockedCounterpartIds.has(candidate.id))
      .map((candidate) => ({
        ...candidate,
        overlapScore: this.calculateOverlapScore(user, candidate),
      }))
      .sort((a, b) => b.overlapScore - a.overlapScore);

    const result = scoredCandidates.map((c) => this.formatBrotherCandidate(c, user));

    // Cache the result — fire-and-forget (cache failure must not break the response)
    this.redis.cacheSet(cacheKey, result, BROTHERS_CACHE_TTL).catch(() => {});

    return result;
  }

  async connectWithBrother(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot connect with yourself');
    }

    // Check both are verified veterans
    const [user, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { veteranDetails: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        include: { veteranDetails: true },
      }),
    ]);

    if (!user || !target) throw new NotFoundException('User not found');

    if (await this.isBlockedBetween(userId, targetUserId)) {
      throw new ForbiddenException('You cannot connect with a user who is blocked');
    }

    const isUserVerified = user.role === UserRole.VETERAN_VERIFIED || user.role === UserRole.VETERAN_MEMBER;
    const isTargetVerified = target.role === UserRole.VETERAN_VERIFIED || target.role === UserRole.VETERAN_MEMBER;
    if (!isUserVerified || !isTargetVerified) {
      throw new ForbiddenException('Both users must be verified veterans');
    }

    // Check if match already exists
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

    // Calculate overlap score
    const overlapScore = this.calculateOverlapScore(user, target);

    // Create match
    const match = await this.prisma.connection.create({
      data: {
        user1Id: userId < targetUserId ? userId : targetUserId,
        user2Id: userId < targetUserId ? targetUserId : userId,
        connectionType: ConnectionType.BROTHERS_IN_ARMS,
        status: ConnectionStatus.ACTIVE,
        overlapScore,
      },
    });

    return match;
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

    return matches.map(match => {
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

  private calculateOverlapScore(user1: any, user2: any): number {
    if (!user1.veteranDetails || !user2.veteranDetails) return 0;

    let score = 0;

    // Same branch bonus
    if (user1.veteranDetails.branch === user2.veteranDetails.branch) {
      score += 20;
    }

    // Deployment theatre overlap (fuzzy — "Helmand" matches "Afghanistan")
    const deployments1: string[] = user1.veteranDetails.deployments || [];
    const deployments2: string[] = user2.veteranDetails.deployments || [];
    for (const d1 of deployments1) {
      for (const d2 of deployments2) {
        if (deploymentsMatch(d1, d2)) { score += 20; break; }
      }
    }

    // Legacy duty station array overlap (fuzzy)
    const stations1: string[] = user1.veteranDetails.dutyStations || [];
    const stations2: string[] = user2.veteranDetails.dutyStations || [];
    for (const s1 of stations1) {
      for (const s2 of stations2) {
        if (unitSimilarity(s1, s2) >= 0.7) { score += 10; break; }
      }
    }

    // Service period overlap with fuzzy unit matching
    const periods1 = user1.veteranDetails.servicePeriods || [];
    const periods2 = user2.veteranDetails.servicePeriods || [];

    for (const p1 of periods1) {
      for (const p2 of periods2) {
        if (!this.periodsOverlap(p1, p2)) continue;

        // Time overlap bonus (scales with overlap length)
        const overlapMonths = this.overlapDurationMonths(p1, p2);
        score += Math.min(25, Math.floor(overlapMonths / 3)); // up to 25 pts for 6+ months overlap

        // Fuzzy unit match
        if (p1.unit && p2.unit) {
          const sim = unitSimilarity(p1.unit, p2.unit);
          if (sim >= 0.8) score += 40;       // strong match: same unit
          else if (sim >= 0.6) score += 20;  // likely same unit
        }

        // Fuzzy duty station match within period
        if (p1.dutyStation && p2.dutyStation) {
          const sim = unitSimilarity(p1.dutyStation, p2.dutyStation);
          if (sim >= 0.7) score += 15;
        }
      }
    }

    return Math.min(score, 100);
  }

  private overlapDurationMonths(p1: any, p2: any): number {
    const start = Math.max(new Date(p1.startDate).getTime(), new Date(p2.startDate).getTime());
    const end1 = p1.endDate ? new Date(p1.endDate).getTime() : Date.now();
    const end2 = p2.endDate ? new Date(p2.endDate).getTime() : Date.now();
    const end = Math.min(end1, end2);
    return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24 * 30)));
  }

  /** Returns structured reasons why two users may know each other */
  private getOverlapReasons(user1: any, candidate: any): string[] {
    const reasons: string[] = [];
    if (!user1.veteranDetails || !candidate.veteranDetails) return reasons;

    const vd1 = user1.veteranDetails;
    const vd2 = candidate.veteranDetails;

    if (vd1.branch && vd2.branch && vd1.branch === vd2.branch) {
      reasons.push(`Both served in the ${this.branchLabel(vd1.branch)}`);
    }

    const periods1 = vd1.servicePeriods || [];
    const periods2 = vd2.servicePeriods || [];
    let sameUnitFound = false;
    let sameStationFound = false;
    let timeOverlapFound = false;

    for (const p1 of periods1) {
      for (const p2 of periods2) {
        if (!this.periodsOverlap(p1, p2)) continue;
        
        if (!timeOverlapFound) {
          const start = new Date(Math.max(new Date(p1.startDate).getTime(), new Date(p2.startDate).getTime()));
          const end1 = p1.endDate ? new Date(p1.endDate) : new Date();
          const end2 = p2.endDate ? new Date(p2.endDate) : new Date();
          const end = new Date(Math.min(end1.getTime(), end2.getTime()));
          const startYear = start.getFullYear();
          const endYear = end.getFullYear();
          const yearRange = startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;
          reasons.push(`Overlapping service ${yearRange}`);
          timeOverlapFound = true;
        }
        
        if (!sameUnitFound && p1.unit && p2.unit && unitSimilarity(p1.unit, p2.unit) >= 0.6) {
          reasons.push(`Same unit: ${p1.unit}`);
          sameUnitFound = true;
        }
        
        if (!sameStationFound && p1.dutyStation && p2.dutyStation && unitSimilarity(p1.dutyStation, p2.dutyStation) >= 0.6) {
          reasons.push(`Same station: ${p1.dutyStation}`);
          sameStationFound = true;
        }
      }
    }

    // Deployment theatre matching (fuzzy)
    const deployments1: string[] = vd1.deployments || [];
    const deployments2: string[] = vd2.deployments || [];
    for (const d1 of deployments1) {
      for (const d2 of deployments2) {
        if (deploymentsMatch(d1, d2)) {
          reasons.push(`Both deployed to ${canonicalTheatre(d1)}`);
          break;
        }
      }
    }

    return reasons.slice(0, 4); // Return at most 4 reasons
  }

  private branchLabel(branch: string): string {
    const labels: Record<string, string> = {
      BRITISH_ARMY: 'British Army', ROYAL_NAVY: 'Royal Navy',
      ROYAL_AIR_FORCE: 'Royal Air Force', ROYAL_MARINES: 'Royal Marines',
      RESERVE_FORCES: 'Reserve Forces', OTHER: 'Armed Forces',
    };
    return labels[branch] || branch;
  }

  private periodsOverlap(p1: any, p2: any): boolean {
    const start1 = new Date(p1.startDate);
    const end1 = p1.endDate ? new Date(p1.endDate) : new Date();
    const start2 = new Date(p2.startDate);
    const end2 = p2.endDate ? new Date(p2.endDate) : new Date();

    return start1 <= end2 && start2 <= end1;
  }

  private formatBrotherCandidate(candidate: any, requestingUser?: any) {
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
      overlappingPeriods: (candidate.veteranDetails?.servicePeriods || []).slice(0, 3).map((p: { unit?: string | null; branch?: string | null; startDate?: Date | null; endDate?: Date | null; dutyStation?: string | null }) => ({
        branch: candidate.veteranDetails.branch,
        dateRange: `${p.startDate ? new Date(p.startDate).getFullYear() : '?'}${p.endDate ? '–' + new Date(p.endDate).getFullYear() : '–present'}`,
        location: p.dutyStation || p.unit || null,
      })),
    };
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
