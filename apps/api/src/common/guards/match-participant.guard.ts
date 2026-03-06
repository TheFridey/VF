import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from '@prisma/client';

@Injectable()
export class MatchParticipantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    const matchId = request.params.matchId;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!matchId) {
      throw new ForbiddenException('Match ID is required');
    }

    // Check if the user is a participant in the match
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { user1Id: true, user2Id: true, status: true },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.status === MatchStatus.CANCELLED) {
      throw new NotFoundException('Match not found');
    }

    const isParticipant = match.user1Id === user.id || match.user2Id === user.id;

    if (!isParticipant) {
      // Admins and moderators can view matches
      if (user.role === 'ADMIN' || user.role === 'MODERATOR') {
        return true;
      }
      throw new ForbiddenException('You are not a participant in this match');
    }

    // Attach match to request for later use
    request.match = match;

    return true;
  }
}
