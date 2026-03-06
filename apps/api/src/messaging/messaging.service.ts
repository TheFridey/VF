import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MatchStatus, MatchType } from '@prisma/client';

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
    // Get all active matches for this user
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: MatchStatus.ACTIVE,
        matchType: MatchType.BROTHERS,
      },
      include: {
        user1: {
          include: { profile: true },
        },
        user2: {
          include: { profile: true },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Get unread counts for each match
    const conversations = await Promise.all(
      matches.map(async (match) => {
        const otherUser = match.user1Id === userId ? match.user2 : match.user1;
        const lastMessage = match.messages[0];

        const unreadCount = await this.prisma.message.count({
          where: {
            matchId: match.id,
            receiverId: userId,
            readAt: null,
            deletedAt: null,
          },
        });

        return {
          matchId: match.id,
          matchType: match.matchType,
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
          unreadCount,
          lastMessageAt: match.lastMessageAt,
        };
      }),
    );

    return { conversations };
  }

  async getUnreadCounts(userId: string) {
    const totalUnread = await this.prisma.message.count({
      where: {
        receiverId: userId,
        readAt: null,
        deletedAt: null,
        match: { status: MatchStatus.ACTIVE, matchType: MatchType.BROTHERS },
      },
    });

    // Get unread counts per match
    const matchUnreads = await this.prisma.message.groupBy({
      by: ['matchId'],
      where: {
        receiverId: userId,
        readAt: null,
        deletedAt: null,
        match: { status: MatchStatus.ACTIVE, matchType: MatchType.BROTHERS },
      },
      _count: { id: true },
    });

    const byMatch: Record<string, number> = {};
    matchUnreads.forEach((m) => {
      byMatch[m.matchId] = m._count.id;
    });

    return {
      total: totalUnread,
      byMatch,
    };
  }

  async getMessages(matchId: string, userId: string, page = 1, limit = 50) {
    // Verify user is participant
    const match = await this.verifyParticipant(matchId, userId);

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { matchId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { matchId, deletedAt: null } }),
    ]);

    // Decrypt messages
    const decryptedMessages = messages.map(msg => ({
      id: msg.id,
      matchId: msg.matchId,
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

  async sendMessage(matchId: string, senderId: string, content: string, ipAddress?: string) {
    // Verify sender is participant
    const match = await this.verifyParticipant(matchId, senderId);

    const receiverId = match.user1Id === senderId ? match.user2Id : match.user1Id;

    // Encrypt message
    const { encrypted, iv, authTag } = this.encryptMessage(content);

    const message = await this.prisma.message.create({
      data: {
        matchId,
        senderId,
        receiverId,
        encryptedContent: encrypted,
        iv,
        authTag,
      },
    });

    // Update match lastMessageAt
    await this.prisma.match.update({
      where: { id: matchId },
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
      matchId: message.matchId,
      senderId: message.senderId,
      content,
      createdAt: message.createdAt,
      isFromMe: true,
    };
  }

  async markAsRead(matchId: string, userId: string) {
    await this.verifyParticipant(matchId, userId);

    await this.prisma.message.updateMany({
      where: {
        matchId,
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

  private async verifyParticipant(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) throw new NotFoundException('Match not found');
    if (match.matchType !== MatchType.BROTHERS) {
      throw new ForbiddenException('Only Brothers in Arms conversations are supported');
    }
    if (match.user1Id !== userId && match.user2Id !== userId) {
      throw new ForbiddenException('Not authorized');
    }
    if (match.status !== MatchStatus.ACTIVE) {
      throw new ForbiddenException('Match is not active');
    }

    return match;
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
