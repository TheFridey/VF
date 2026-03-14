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
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { ConnectionType } from '../common/enums/connection.enum';
import { MessageCrypto, parseEncryptionKeyFallbacks } from './message-crypto';

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
  private readonly messageCrypto: MessageCrypto;

  private readonly WS_RATE_LIMIT = 10;
  private readonly WS_RATE_WINDOW = 60;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {
    this.messageCrypto = new MessageCrypto(
      this.configService.get('ENCRYPTION_KEY', 'default-dev-encryption-key-32ch'),
      parseEncryptionKeyFallbacks(this.configService.get('ENCRYPTION_KEY_FALLBACKS')),
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

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      // IP-based connection rate limit: max 10 new WS connections per IP per 60s
      const clientIp = (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        ?? socket.handshake.address ?? 'unknown';
      const attempts = await this.redisService.incrementRateLimit(`ws_connect:${clientIp}`, this.WS_RATE_WINDOW);
      if (attempts > this.WS_RATE_LIMIT) {
        this.logger.warn(`WS rate limit exceeded for IP ${clientIp}`);
        socket.disconnect();
        return;
      }

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

      // Check JWT blacklist - logout must invalidate WS connections too
      const isBlacklisted = await this.redisService.exists(`blacklist:${String(payload.sub)}:${String(payload.iat)}`);
      if (isBlacklisted) {
        socket.disconnect();
        return;
      }

      socket.userId = payload.sub;
      
      // Track connected users
      const uid = socket.userId!;
      const existingSockets = this.connectedUsers.get(uid) || [];
      existingSockets.push(socket.id);
      this.connectedUsers.set(uid, existingSockets);

      // Join user to their own room for direct messages
      socket.join(`user:${socket.userId!}`);

      // Join user to their active connection rooms.
      // This query IS awaited because socket.io rooms must be joined before
      // the connection is considered ready to receive messages.
      const connections = await this.prisma.connection.findMany({
        where: {
          OR: [
            { user1Id: socket.userId },
            { user2Id: socket.userId },
          ],
          status: 'ACTIVE',
          connectionType: ConnectionType.BROTHERS_IN_ARMS,
        },
        select: { id: true }, // select only what we need — avoids fetching full rows
      });

      for (const conn of connections) {
        socket.join(`connection:${conn.id}`);
      }

      this.logger.log(`User ${socket.userId} connected (socket: ${socket.id})`);

      // Notify user is online
      this.server.emit('user:online', { userId: socket.userId });

      // Update last active — fire-and-forget.
      // This is telemetry only; it must not hold up the WS handshake or
      // occupy a pool connection while callers wait for the response.
      this.prisma.profile.updateMany({
        where: { userId: socket.userId },
        data: { lastActiveAt: new Date() },
      }).catch(() => { /* non-critical — ignore errors */ });

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
      
      // Update last active — fire-and-forget (telemetry, must not hold pool connection)
      this.prisma.profile.updateMany({
        where: { userId: socket.userId },
        data: { lastActiveAt: new Date() },
      }).catch(() => { /* non-critical */ });
    } else {
      this.connectedUsers.set(socket.userId, updatedSockets);
    }

    this.logger.log(`User ${socket.userId} disconnected (socket: ${socket.id})`);
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { connectionId: string; content: string },
  ) {
    if (!socket.userId) return;

    try {
      // Verify user is part of this match
      const conn = await this.prisma.connection.findFirst({
        where: {
          id: data.connectionId,
          OR: [
            { user1Id: socket.userId },
            { user2Id: socket.userId },
          ],
          status: 'ACTIVE',
          connectionType: ConnectionType.BROTHERS_IN_ARMS,
        },
      });

      if (!conn) {
        socket.emit('error', { message: 'Connection not found or unauthorized' });
        return;
      }

      const receiverId = conn.user1Id === socket.userId ? conn.user2Id : conn.user1Id;

      // Encrypt the message
      const { encrypted, iv, authTag } = this.encryptMessage(data.content);

      // Create message with encryption
      const message = await this.prisma.message.create({
        data: {
          connectionId: data.connectionId,
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
      await this.prisma.connection.update({
        where: { id: data.connectionId },
        data: { lastMessageAt: new Date() },
      });

      // Emit to match room (decrypted for real-time display)
      this.server.to(`connection:${data.connectionId}`).emit('message:new', {
        id: message.id,
        connectionId: message.connectionId,
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
          connectionId: data.connectionId,
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
    @MessageBody() data: { connectionId: string; messageIds: string[] },
  ) {
    if (!socket.userId) return;

    try {
      // Mark messages as read
      await this.prisma.message.updateMany({
        where: {
          id: { in: data.messageIds },
          receiverId: socket.userId,
          connectionId: data.connectionId,
        },
        data: {
          readAt: new Date(),
        },
      });

      // Notify sender that messages were read
      this.server.to(`connection:${data.connectionId}`).emit('message:read', {
        connectionId: data.connectionId,
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
    @MessageBody() data: { connectionId: string },
  ) {
    if (!socket.userId) return;

    socket.to(`connection:${data.connectionId}`).emit('typing:start', {
      connectionId: data.connectionId,
      userId: socket.userId,
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { connectionId: string },
  ) {
    if (!socket.userId) return;

    socket.to(`connection:${data.connectionId}`).emit('typing:stop', {
      connectionId: data.connectionId,
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
  notifyNewMatch(connectionId: string, user1Id: string, user2Id: string) {
    this.sendToUser(user1Id, 'match:new', { connectionId });
    this.sendToUser(user2Id, 'match:new', { connectionId });
  }
}
