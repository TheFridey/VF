import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConnectionStatus, ConnectionType } from '../common/enums/connection.enum';

@Injectable()
export class MessagingService {
  private encryptionKey: Buffer;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private configService: ConfigService,
  ) {
    const key = this.configService.get('ENCRYPTION_KEY', 'default-dev-encryption-key-32ch');
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
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

    const conversations = connections.map((connection) => {
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
    const totalUnread = await this.prisma.message.count({
      where: {
        receiverId: userId,
        readAt: null,
        deletedAt: null,
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

    await this.prisma.message.updateMany({
      where: {
        connectionId,
        receiverId: userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { success: true };
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

    return connection;
  }

  private encryptMessage(content: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(content, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag,
    };
  }

  private decryptMessage(encrypted: string, iv: string, authTag: string): string {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        Buffer.from(iv, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(authTag, 'base64'));

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      return '[Unable to decrypt message]';
    }
  }
}
