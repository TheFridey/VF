import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConnectionStatus, ConnectionType } from '../common/enums/connection.enum';
import { MessageCrypto, parseEncryptionKeyFallbacks } from './message-crypto';

@Injectable()
export class MessagingService {
  private readonly messageCrypto: MessageCrypto;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private configService: ConfigService,
  ) {
    this.messageCrypto = new MessageCrypto(
      this.configService.get('ENCRYPTION_KEY', 'default-dev-encryption-key-32ch'),
      parseEncryptionKeyFallbacks(this.configService.get('ENCRYPTION_KEY_FALLBACKS')),
    );
  }

  async getConversations(userId: string) {
    // Single query: connections + last message per connection (included relation)
    // + unread counts via a single groupBy aggregation below.
    // Previously this fired 1 + N queries (N = number of conversations).
    // Now it fires exactly 2 queries regardless of conversation count.
    const [connections, unreadGroups] = await Promise.all([
      this.prisma.connection.findMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
          status: ConnectionStatus.ACTIVE,
          connectionType: ConnectionType.BROTHERS_IN_ARMS,
        },
        include: {
          user1: { include: { profile: true } },
          user2: { include: { profile: true } },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
      // Single aggregation to get unread counts for ALL conversations at once
      this.prisma.message.groupBy({
        by: ['connectionId'],
        where: {
          receiverId: userId,
          readAt: null,
          deletedAt: null,
          connection: {
            status: ConnectionStatus.ACTIVE,
            connectionType: ConnectionType.BROTHERS_IN_ARMS,
          },
        },
        _count: { id: true },
      }),
    ]);

    // Build a O(1) lookup map from the aggregation result
    const unreadByConnection = new Map<string, number>(
      unreadGroups.map((g) => [g.connectionId, g._count.id]),
    );

    const blockedCounterpartIds = await this.getBlockedCounterpartIds(
      userId,
      connections.map((connection) => (connection.user1Id === userId ? connection.user2Id : connection.user1Id)),
    );

    const conversations = connections
      .filter((connection) => {
        const otherUserId = connection.user1Id === userId ? connection.user2Id : connection.user1Id;
        return !blockedCounterpartIds.has(otherUserId);
      })
      .map((connection) => {
      const otherUser = connection.user1Id === userId ? connection.user2 : connection.user1;
      const lastMessage = connection.messages[0];

      return {
        connectionId: connection.id,
        connectionType: connection.connectionType,
        user: {
          id: otherUser.id,
          displayName: otherUser.profile?.displayName || 'Unknown',
          photoUrl: otherUser.profile?.profileImageUrl || null,
        },
        lastMessage: lastMessage
          ? {
              content: this.decryptMessage(
                lastMessage.encryptedContent,
                lastMessage.iv,
                lastMessage.authTag,
              ),
              createdAt: lastMessage.createdAt,
              isFromMe: lastMessage.senderId === userId,
            }
          : null,
        unreadCount: unreadByConnection.get(connection.id) ?? 0,
        lastMessageAt: connection.lastMessageAt,
      };
      });

    return { conversations };
  }

  async getUnreadCounts(userId: string) {
    const blockedCounterpartIds = Array.from(await this.getBlockedCounterpartIds(userId));
    const blockedSenderFilter =
      blockedCounterpartIds.length > 0
        ? { senderId: { notIn: blockedCounterpartIds } }
        : {};

    const totalUnread = await this.prisma.message.count({
      where: {
        receiverId: userId,
        readAt: null,
        deletedAt: null,
        ...blockedSenderFilter,
        connection: { status: ConnectionStatus.ACTIVE, connectionType: ConnectionType.BROTHERS_IN_ARMS },
      },
    });

    // Get unread counts per match
    const connectionUnreads = await this.prisma.message.groupBy({
      by: ['connectionId'],
      where: {
        receiverId: userId,
        readAt: null,
        deletedAt: null,
        ...blockedSenderFilter,
        connection: { status: ConnectionStatus.ACTIVE, connectionType: ConnectionType.BROTHERS_IN_ARMS },
      },
      _count: { id: true },
    });

    const byConnection: Record<string, number> = {};
    connectionUnreads.forEach((m) => {
      byConnection[m.connectionId] = m._count.id;
    });

    return {
      total: totalUnread,
      byConnection,
    };
  }

  async getMessages(connectionId: string, userId: string, page = 1, limit = 50) {
    // Verify user is participant
    const connection = await this.verifyParticipant(connectionId, userId);

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { connectionId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { connectionId, deletedAt: null } }),
    ]);

    // Decrypt messages
    const decryptedMessages = messages.map(msg => ({
      id: msg.id,
      connectionId: msg.connectionId,
      senderId: msg.senderId,
      content: this.decryptMessage(msg.encryptedContent, msg.iv, msg.authTag),
      createdAt: msg.createdAt,
      readAt: msg.readAt,
      editedAt: msg.editedAt,
      isFromMe: msg.senderId === userId,
    }));

    return {
      messages: decryptedMessages.reverse(),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sendMessage(connectionId: string, senderId: string, content: string, ipAddress?: string) {
    // Verify sender is participant
    const connection = await this.verifyParticipant(connectionId, senderId);

    const receiverId = connection.user1Id === senderId ? connection.user2Id : connection.user1Id;

    // Encrypt message
    const { encrypted, iv, authTag } = this.encryptMessage(content);

    const message = await this.prisma.message.create({
      data: {
        connectionId,
        senderId,
        receiverId,
        encryptedContent: encrypted,
        iv,
        authTag,
      },
    });

    // Update match lastMessageAt
    await this.prisma.connection.update({
      where: { id: connectionId },
      data: { lastMessageAt: new Date() },
    });

    await this.auditService.log({
      userId: senderId,
      action: 'message_sent',
      resource: 'message',
      resourceId: message.id,
      ipAddress,
    });

    return {
      id: message.id,
      connectionId: message.connectionId,
      senderId: message.senderId,
      content,
      createdAt: message.createdAt,
      isFromMe: true,
    };
  }

  async markAsRead(connectionId: string, userId: string) {
    await this.verifyParticipant(connectionId, userId);

    const unreadMessage = await this.prisma.message.findFirst({
      where: {
        connectionId,
        receiverId: userId,
        readAt: null,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!unreadMessage) {
      return {
        success: true,
        updatedCount: 0,
        alreadyRead: true,
      };
    }

    const result = await this.prisma.message.updateMany({
      where: {
        connectionId,
        receiverId: userId,
        readAt: null,
        deletedAt: null,
      },
      data: { readAt: new Date() },
    });

    return {
      success: true,
      updatedCount: result.count,
      alreadyRead: result.count === 0,
    };
  }

  async deleteMessage(messageId: string, userId: string, ipAddress?: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot delete this message');

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId,
      action: 'message_deleted',
      resource: 'message',
      resourceId: messageId,
      ipAddress,
    });

    return { success: true };
  }

  async editMessage(messageId: string, userId: string, newContent: string, ipAddress?: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot edit this message');

    // Only allow editing within 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      throw new ForbiddenException('Message can only be edited within 15 minutes');
    }

    const { encrypted, iv, authTag } = this.encryptMessage(newContent);

    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        encryptedContent: encrypted,
        iv,
        authTag,
        editedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      action: 'message_edited',
      resource: 'message',
      resourceId: messageId,
      ipAddress,
    });

    return { success: true };
  }

  private async verifyParticipant(connectionId: string, userId: string) {
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) throw new NotFoundException('Connection not found');
    if (connection.connectionType !== ConnectionType.BROTHERS_IN_ARMS) {
      throw new ForbiddenException('Only Brothers in Arms conversations are supported');
    }
    if (connection.user1Id !== userId && connection.user2Id !== userId) {
      throw new ForbiddenException('Not authorized');
    }
    if (connection.status !== ConnectionStatus.ACTIVE) {
      throw new ForbiddenException('Connection is not active');
    }

    const otherUserId = connection.user1Id === userId ? connection.user2Id : connection.user1Id;
    if (await this.isBlockedBetween(userId, otherUserId)) {
      throw new ForbiddenException('This conversation is unavailable because one of the users has been blocked');
    }

    return connection;
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

  private encryptMessage(content: string): { encrypted: string; iv: string; authTag: string } {
    const { encryptedContent, iv, authTag } = this.messageCrypto.encryptMessage(content);
    return {
      encrypted: encryptedContent,
      iv,
      authTag,
    };
  }

  private decryptMessage(encrypted: string, iv: string, authTag: string): string {
    return this.messageCrypto.decryptMessage(encrypted, iv, authTag);
  }
}
