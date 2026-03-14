import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConnectionStatus, ConnectionType } from '../common/enums/connection.enum';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  async getMatches(userId: string) {
    const connections = await this.prisma.connection.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: ConnectionStatus.ACTIVE,
      },
      include: {
        user1: { select: { id: true, profile: true, veteranDetails: true } },
        user2: { select: { id: true, profile: true, veteranDetails: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return connections.map(c => this.formatConnection(c, userId));
  }

  async getMatch(connectionId: string, userId: string) {
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
      include: {
        user1: {
          select: {
            id: true, role: true, profile: true,
            veteranDetails: { include: { servicePeriods: true } },
          },
        },
        user2: {
          select: {
            id: true, role: true, profile: true,
            veteranDetails: { include: { servicePeriods: true } },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!connection) throw new NotFoundException('Connection not found');
    if (connection.user1Id !== userId && connection.user2Id !== userId) {
      throw new ForbiddenException('Not authorised to view this connection');
    }

    return this.formatConnectionDetail(connection, userId);
  }

  async unmatch(connectionId: string, userId: string) {
    const connection = await this.prisma.connection.findUnique({ where: { id: connectionId } });

    if (!connection) throw new NotFoundException('Connection not found');
    if (connection.user1Id !== userId && connection.user2Id !== userId) {
      throw new ForbiddenException('Not authorised');
    }
    if (connection.status !== ConnectionStatus.ACTIVE) {
      throw new ForbiddenException('Connection is not active');
    }

    return this.prisma.connection.update({
      where: { id: connectionId },
      data: { status: ConnectionStatus.CANCELLED },
    });
  }

  async getMatchStats() {
    const [total, active, bia] = await Promise.all([
      this.prisma.connection.count(),
      this.prisma.connection.count({ where: { status: ConnectionStatus.ACTIVE } }),
      this.prisma.connection.count({ where: { connectionType: ConnectionType.BROTHERS_IN_ARMS } }),
    ]);

    return { total, active, brothersInArms: bia };
  }

  private formatConnection(connection: any, currentUserId: string) {
    const otherUser = connection.user1Id === currentUserId ? connection.user2 : connection.user1;
    const lastMessage = connection.messages[0];

    return {
      id:             connection.id,
      connectionType: connection.connectionType,
      status:         connection.status,
      overlapScore:   connection.overlapScore,
      createdAt:      connection.createdAt,
      lastMessageAt:  connection.lastMessageAt,
      otherUser: {
        id:              otherUser.id,
        displayName:     otherUser.profile?.displayName,
        profileImageUrl: otherUser.profile?.profileImageUrl,
        lastActiveAt:    otherUser.profile?.lastActiveAt,
      },
      lastMessage: lastMessage ? {
        preview:    '[Message]',
        createdAt:  lastMessage.createdAt,
        isFromMe:   lastMessage.senderId === currentUserId,
      } : null,
    };
  }

  private formatConnectionDetail(connection: any, currentUserId: string) {
    const otherUser = connection.user1Id === currentUserId ? connection.user2 : connection.user1;

    return {
      id:             connection.id,
      connectionType: connection.connectionType,
      status:         connection.status,
      overlapScore:   connection.overlapScore,
      createdAt:      connection.createdAt,
      otherUser: {
        id:             otherUser.id,
        role:           otherUser.role,
        profile:        otherUser.profile,
        veteranDetails: otherUser.veteranDetails,
      },
    };
  }
}
