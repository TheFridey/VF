import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MatchStatus, MatchType } from '@prisma/client';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  async getMatches(userId: string) {
    const where = {
      OR: [{ user1Id: userId }, { user2Id: userId }],
      status: MatchStatus.ACTIVE,
      matchType: MatchType.BROTHERS,
    };

    const matches = await this.prisma.match.findMany({
      where,
      include: {
        user1: {
          select: {
            id: true,
            profile: true,
            veteranDetails: true,
          },
        },
        user2: {
          select: {
            id: true,
            profile: true,
            veteranDetails: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return matches.map(match => this.formatMatch(match, userId));
  }

  async getMatch(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        user1: {
          select: {
            id: true,
            role: true,
            profile: true,
            veteranDetails: {
              include: { servicePeriods: true },
            },
          },
        },
        user2: {
          select: {
            id: true,
            role: true,
            profile: true,
            veteranDetails: {
              include: { servicePeriods: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!match) throw new NotFoundException('Match not found');
    if (match.matchType !== MatchType.BROTHERS) {
      throw new ForbiddenException('Only Brothers in Arms connections are supported');
    }

    // Verify user is participant
    if (match.user1Id !== userId && match.user2Id !== userId) {
      throw new ForbiddenException('Not authorized to view this match');
    }

    return this.formatMatchDetail(match, userId);
  }

  async unmatch(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) throw new NotFoundException('Match not found');
    if (match.matchType !== MatchType.BROTHERS) {
      throw new ForbiddenException('Only Brothers in Arms connections are supported');
    }

    if (match.user1Id !== userId && match.user2Id !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (match.status !== MatchStatus.ACTIVE) {
      throw new ForbiddenException('Match is not active');
    }

    return this.prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.CANCELLED },
    });
  }

  async getMatchStats() {
    const [total, active] = await Promise.all([
      this.prisma.match.count({ where: { matchType: MatchType.BROTHERS } }),
      this.prisma.match.count({
        where: { matchType: MatchType.BROTHERS, status: MatchStatus.ACTIVE },
      }),
    ]);

    return { total, active };
  }

  private formatMatch(match: any, currentUserId: string) {
    const otherUser = match.user1Id === currentUserId ? match.user2 : match.user1;
    const lastMessage = match.messages[0];

    return {
      id: match.id,
      matchType: match.matchType,
      status: match.status,
      overlapScore: match.overlapScore,
      createdAt: match.createdAt,
      lastMessageAt: match.lastMessageAt,
      otherUser: {
        id: otherUser.id,
        displayName: otherUser.profile?.displayName,
        profileImageUrl: otherUser.profile?.profileImageUrl,
        lastActiveAt: otherUser.profile?.lastActiveAt,
      },
      lastMessage: lastMessage ? {
        preview: '[Message]', // Don't decrypt here
        createdAt: lastMessage.createdAt,
        isFromMe: lastMessage.senderId === currentUserId,
      } : null,
    };
  }

  private formatMatchDetail(match: any, currentUserId: string) {
    const otherUser = match.user1Id === currentUserId ? match.user2 : match.user1;

    return {
      id: match.id,
      matchType: match.matchType,
      status: match.status,
      overlapScore: match.overlapScore,
      createdAt: match.createdAt,
      otherUser: {
        id: otherUser.id,
        role: otherUser.role,
        profile: otherUser.profile,
        veteranDetails: match.matchType === MatchType.BROTHERS ? otherUser.veteranDetails : null,
      },
    };
  }
}
