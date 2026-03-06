import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { MatchType } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers: Map<string, string[]> = new Map(); // userId -> socketIds
  private encryptionKey: Buffer;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const key = this.configService.get('ENCRYPTION_KEY', 'default-dev-encryption-key-32ch');
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
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

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        socket.disconnect();
        return;
      }

      // Verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      socket.userId = payload.sub;
      
      // Track connected users
      const existingSockets = this.connectedUsers.get(socket.userId) || [];
      existingSockets.push(socket.id);
      this.connectedUsers.set(socket.userId, existingSockets);

      // Join user to their own room for direct messages
      socket.join(`user:${socket.userId}`);

      // Join user to their match rooms
      const matches = await this.prisma.match.findMany({
        where: {
          OR: [
            { user1Id: socket.userId },
            { user2Id: socket.userId },
          ],
          status: 'ACTIVE',
          matchType: MatchType.BROTHERS,
        },
      });

      for (const match of matches) {
        socket.join(`match:${match.id}`);
      }

      this.logger.log(`User ${socket.userId} connected (socket: ${socket.id})`);

      // Notify user is online
      this.server.emit('user:online', { userId: socket.userId });

      // Update last active
      await this.prisma.profile.updateMany({
        where: { userId: socket.userId },
        data: { lastActiveAt: new Date() },
      });

    } catch (error) {
      this.logger.warn(`Connection rejected: Invalid token`);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    // Remove from connected users
    const existingSockets = this.connectedUsers.get(socket.userId) || [];
    const updatedSockets = existingSockets.filter(id => id !== socket.id);
    
    if (updatedSockets.length === 0) {
      this.connectedUsers.delete(socket.userId);
      
      // Notify user is offline (only when all sockets disconnected)
      this.server.emit('user:offline', { userId: socket.userId });
      
      // Update last active
      await this.prisma.profile.updateMany({
        where: { userId: socket.userId },
        data: { lastActiveAt: new Date() },
      });
    } else {
      this.connectedUsers.set(socket.userId, updatedSockets);
    }

    this.logger.log(`User ${socket.userId} disconnected (socket: ${socket.id})`);
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; content: string },
  ) {
    if (!socket.userId) return;

    try {
      // Verify user is part of this match
      const match = await this.prisma.match.findFirst({
        where: {
          id: data.matchId,
          OR: [
            { user1Id: socket.userId },
            { user2Id: socket.userId },
          ],
          status: 'ACTIVE',
          matchType: MatchType.BROTHERS,
        },
      });

      if (!match) {
        socket.emit('error', { message: 'Match not found or unauthorized' });
        return;
      }

      const receiverId = match.user1Id === socket.userId ? match.user2Id : match.user1Id;

      // Encrypt the message
      const { encrypted, iv, authTag } = this.encryptMessage(data.content);

      // Create message with encryption
      const message = await this.prisma.message.create({
        data: {
          matchId: data.matchId,
          senderId: socket.userId,
          receiverId,
          encryptedContent: encrypted,
          iv,
          authTag,
        },
      });

      // Get sender info
      const sender = await this.prisma.user.findUnique({
        where: { id: socket.userId },
        include: {
          profile: {
            select: {
              displayName: true,
              profileImageUrl: true,
            },
          },
        },
      });

      // Update match's lastMessageAt
      await this.prisma.match.update({
        where: { id: data.matchId },
        data: { lastMessageAt: new Date() },
      });

      // Emit to match room (decrypted for real-time display)
      this.server.to(`match:${data.matchId}`).emit('message:new', {
        id: message.id,
        matchId: message.matchId,
        senderId: message.senderId,
        content: data.content, // Send decrypted content to clients
        createdAt: message.createdAt,
        sender: {
          id: socket.userId,
          displayName: sender?.profile?.displayName,
          profileImageUrl: sender?.profile?.profileImageUrl,
        },
      });

      // Send push notification to receiver if they're not online
      if (!this.connectedUsers.has(receiverId)) {
        // Trigger push notification (handled by push notification service)
        this.server.emit('push:message', {
          userId: receiverId,
          matchId: data.matchId,
          senderId: socket.userId,
          preview: data.content.substring(0, 50),
        });
      }

    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; messageIds: string[] },
  ) {
    if (!socket.userId) return;

    try {
      // Mark messages as read
      await this.prisma.message.updateMany({
        where: {
          id: { in: data.messageIds },
          receiverId: socket.userId,
          matchId: data.matchId,
        },
        data: {
          readAt: new Date(),
        },
      });

      // Notify sender that messages were read
      this.server.to(`match:${data.matchId}`).emit('message:read', {
        matchId: data.matchId,
        messageIds: data.messageIds,
        readBy: socket.userId,
        readAt: new Date(),
      });

    } catch (error) {
      this.logger.error(`Failed to mark messages as read: ${error.message}`);
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    if (!socket.userId) return;

    socket.to(`match:${data.matchId}`).emit('typing:start', {
      matchId: data.matchId,
      userId: socket.userId,
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    if (!socket.userId) return;

    socket.to(`match:${data.matchId}`).emit('typing:stop', {
      matchId: data.matchId,
      userId: socket.userId,
    });
  }

  // Helper method to check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Helper method to send message to specific user
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Helper method to send notification about new match
  notifyNewMatch(matchId: string, user1Id: string, user2Id: string) {
    this.sendToUser(user1Id, 'match:new', { matchId });
    this.sendToUser(user2Id, 'match:new', { matchId });
  }
}
