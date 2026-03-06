import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserRole, MatchType, MatchStatus, MilitaryBranch } from '@prisma/client';

@Injectable()
export class BrothersService {
  constructor(private prisma: PrismaService) {}

  async getConnectionRequests(userId: string) {
    // Get pending connection requests (matches in PENDING status where user is user2)
    const requests = await this.prisma.match.findMany({
      where: {
        matchType: MatchType.BROTHERS,
        status: MatchStatus.PENDING,
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

    return {
      requests: requests.map((req) => ({
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
        include: { veteranDetails: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        include: { veteranDetails: true },
      }),
    ]);

    if (!user || !target) throw new NotFoundException('User not found');

    const isUserVerified = user.role === UserRole.VETERAN_VERIFIED || user.role === UserRole.VETERAN_PAID;
    const isTargetVerified = target.role === UserRole.VETERAN_VERIFIED || target.role === UserRole.VETERAN_PAID;
    if (!isUserVerified || !isTargetVerified) {
      throw new ForbiddenException('Both users must be verified veterans');
    }

    // Check if connection already exists
    const existingMatch = await this.prisma.match.findFirst({
      where: {
        matchType: MatchType.BROTHERS,
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
    const match = await this.prisma.match.create({
      data: {
        user1Id: userId,
        user2Id: targetUserId,
        matchType: MatchType.BROTHERS,
        status: MatchStatus.PENDING,
        overlapScore,
      },
    });

    return { success: true, matchId: match.id };
  }

  async respondToRequest(userId: string, requestId: string, accept: boolean) {
    const match = await this.prisma.match.findUnique({
      where: { id: requestId },
    });

    if (!match) throw new NotFoundException('Request not found');
    if (match.user2Id !== userId) throw new ForbiddenException('Not authorized');
    if (match.status !== MatchStatus.PENDING) {
      throw new BadRequestException('Request already processed');
    }

    if (accept) {
      await this.prisma.match.update({
        where: { id: requestId },
        data: { status: MatchStatus.ACTIVE },
      });
      return { success: true, accepted: true };
    } else {
      await this.prisma.match.delete({
        where: { id: requestId },
      });
      return { success: true, accepted: false };
    }
  }

  async searchBrothers(userId: string, filters?: any) {
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
    
    if (user.role !== UserRole.VETERAN_VERIFIED && user.role !== UserRole.VETERAN_PAID) {
      throw new ForbiddenException('Only verified veterans can use Brothers in Arms');
    }

    // Find other verified veterans with overlapping service
    const candidates = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        role: { in: [UserRole.VETERAN_VERIFIED, UserRole.VETERAN_PAID] },
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

    // Calculate overlap scores
    const scoredCandidates = candidates
      .map((candidate: any) => ({
        ...candidate,
        overlapScore: this.calculateOverlapScore(user, candidate),
      }))
      .filter((c: any) => c.overlapScore > 0)
      .sort((a: any, b: any) => b.overlapScore - a.overlapScore);

    return scoredCandidates.map((c: any) => this.formatBrotherCandidate(c));
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

    const isUserVerified = user.role === UserRole.VETERAN_VERIFIED || user.role === UserRole.VETERAN_PAID;
    const isTargetVerified = target.role === UserRole.VETERAN_VERIFIED || target.role === UserRole.VETERAN_PAID;
    if (!isUserVerified || !isTargetVerified) {
      throw new ForbiddenException('Both users must be verified veterans');
    }

    // Check if match already exists
    const existingMatch = await this.prisma.match.findFirst({
      where: {
        matchType: MatchType.BROTHERS,
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
    const match = await this.prisma.match.create({
      data: {
        user1Id: userId < targetUserId ? userId : targetUserId,
        user2Id: userId < targetUserId ? targetUserId : userId,
        matchType: MatchType.BROTHERS,
        status: MatchStatus.ACTIVE,
        overlapScore,
      },
    });

    return match;
  }

  async getBrotherConnections(userId: string) {
    const matches = await this.prisma.match.findMany({
      where: {
        matchType: MatchType.BROTHERS,
        status: MatchStatus.ACTIVE,
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
        matchId: match.id,
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

    // Check duty station overlap
    const stations1 = new Set(user1.veteranDetails.dutyStations || []);
    const stations2 = user2.veteranDetails.dutyStations || [];
    for (const station of stations2) {
      if (stations1.has(station)) {
        score += 15;
      }
    }

    // Check service period overlap
    const periods1 = user1.veteranDetails.servicePeriods || [];
    const periods2 = user2.veteranDetails.servicePeriods || [];

    for (const p1 of periods1) {
      for (const p2 of periods2) {
        if (this.periodsOverlap(p1, p2)) {
          score += 25;
          
          // Same unit during overlap
          if (p1.unit && p2.unit && p1.unit === p2.unit) {
            score += 40;
          }
          
          // Same duty station during overlap
          if (p1.dutyStation && p2.dutyStation && p1.dutyStation === p2.dutyStation) {
            score += 30;
          }
        }
      }
    }

    return Math.min(score, 100); // Cap at 100
  }

  private periodsOverlap(p1: any, p2: any): boolean {
    const start1 = new Date(p1.startDate);
    const end1 = p1.endDate ? new Date(p1.endDate) : new Date();
    const start2 = new Date(p2.startDate);
    const end2 = p2.endDate ? new Date(p2.endDate) : new Date();

    return start1 <= end2 && start2 <= end1;
  }

  private formatBrotherCandidate(candidate: any) {
    const age = candidate.profile?.dateOfBirth 
      ? Math.floor((Date.now() - new Date(candidate.profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;
      
    return {
      id: candidate.id,
      displayName: candidate.profile?.displayName || 'Unknown',
      bio: candidate.profile?.bio || null,
      profileImageUrl: candidate.profile?.profileImageUrl || null,
      location: candidate.profile?.location || null,
      age,
      interests: candidate.profile?.interests || [],
      overlapScore: candidate.overlapScore / 100, // Convert to 0-1 range
      veteranInfo: candidate.veteranDetails ? {
        branch: candidate.veteranDetails.branch,
        rank: candidate.veteranDetails.rank,
        isVerified: true, // Only verified vets can use Brothers
      } : null,
      overlappingPeriods: candidate.veteranDetails?.dutyStations?.slice(0, 3).map((station: string) => ({
        branch: candidate.veteranDetails.branch,
        dateRange: 'Overlapping service',
        location: station,
      })) || [],
    };
  }
}
