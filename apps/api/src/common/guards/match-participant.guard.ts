import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectionStatus } from '../enums/connection.enum';

@Injectable()
export class MatchParticipantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    const matchId = request.params.matchId || request.params.connectionId;

    if (!user) throw new ForbiddenException('User not authenticated');
    if (!matchId) throw new ForbiddenException('Connection ID is required');

    const connection = await this.prisma.connection.findUnique({
      where: { id: matchId },
      select: { user1Id: true, user2Id: true, status: true },
    });

    if (!connection) throw new NotFoundException('Connection not found');

    if (connection.status === ConnectionStatus.CANCELLED) {
      throw new NotFoundException('Connection not found');
    }

    const isParticipant = connection.user1Id === user.id || connection.user2Id === user.id;

    if (!isParticipant) {
      if (user.role === 'ADMIN' || user.role === 'MODERATOR') return true;
      throw new ForbiddenException('You are not a participant in this connection');
    }

    request.match = connection;
    return true;
  }
}
