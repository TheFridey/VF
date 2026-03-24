import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConnectionType } from '../common/enums/connection.enum';
import { PrismaService } from '../common/prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface CallSession {
  callerId: string;
  calleeId: string;
  connectionId: string;
  status: 'ringing' | 'connected' | 'ended';
  startedAt: Date;
  iceServers: Array<{
    urls: string[];
    username: string;
    credential: string;
  }>;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/video',
})
export class VideoGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VideoGateway.name);
  // TODO(scale): these registries assume one API process owns all socket presence.
  // If video moves to multiple instances, presence, call sessions, and timeout
  // ownership will need a shared store plus pub/sub coordination.
  private connectedUsers: Map<string, string[]> = new Map(); // userId -> socketIds
  private activeCalls: Map<string, CallSession> = new Map(); // callId -> session
  private callTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        await this.authenticateSocket(socket as AuthenticatedSocket);
        next();
      } catch (error) {
        next(error instanceof Error ? error : new Error('Authentication failed'));
      }
    });
  }

  private extractToken(socket: AuthenticatedSocket): string | null {
    const authToken = socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (authToken) {
      return authToken;
    }

    const cookieHeader = socket.handshake.headers?.cookie;
    if (!cookieHeader) {
      return null;
    }

    const accessTokenCookie = cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith('access_token='));

    return accessTokenCookie ? decodeURIComponent(accessTokenCookie.slice('access_token='.length)) : null;
  }

  private async authenticateSocket(socket: AuthenticatedSocket) {
    const token = this.extractToken(socket);

    if (!token) {
      throw new Error('Authentication token required');
    }

    const payload = await this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    socket.userId = String(payload.sub);
  }

  private getSocketIds(userId: string): string[] {
    return this.connectedUsers.get(userId) || [];
  }

  private emitToUser(userId: string, event: string, payload: unknown) {
    // TODO(scale): replace direct socket iteration with a broker-backed fan-out when
    // the video namespace is served by more than one API instance.
    this.getSocketIds(userId).forEach((socketId) => {
      this.server.to(socketId).emit(event, payload);
    });
  }

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      if (!socket.userId) {
        socket.disconnect(true);
        return;
      }

      const existingSockets = this.getSocketIds(socket.userId);
      if (!existingSockets.includes(socket.id)) {
        this.connectedUsers.set(socket.userId, [...existingSockets, socket.id]);
      }

      this.logger.log(`Video: User ${socket.userId!} connected`);

    } catch (error) {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    const updatedSockets = this.getSocketIds(socket.userId).filter((socketId) => socketId !== socket.id);
    if (updatedSockets.length > 0) {
      this.connectedUsers.set(socket.userId, updatedSockets);
    } else {
      this.connectedUsers.delete(socket.userId);

      // End any active calls only when the user's last socket disconnects.
      for (const [callId, session] of this.activeCalls.entries()) {
        if (session.callerId === socket.userId || session.calleeId === socket.userId) {
          this.endCall(callId, 'disconnected');
        }
      }
    }
    this.logger.log(`Video: User ${socket.userId} disconnected`);
  }

  /**
   * Initiate a video call
   */
  // Generate time-limited TURN credentials (HMAC-SHA1 with shared secret)
  private getTurnCredentials(): { urls: string[]; username: string; credential: string } | null {
    const secret = this.configService?.get<string>('TURN_SECRET');
    const host = this.configService?.get<string>('TURN_HOST', 'turn.veteranfinder.co.uk');
    if (!secret) return null;

    const timestamp = Math.floor(Date.now() / 1000) + 24 * 3600; // valid 24h
    const username = `${timestamp}:veteranfinder`;
    const credential = require('crypto')
      .createHmac('sha1', secret)
      .update(username)
      .digest('base64');

    return {
      urls: [
        `turn:${host}:3478?transport=udp`,
        `turn:${host}:3478?transport=tcp`,
        `stun:${host}:3478`,
      ],
      username,
      credential,
    };
  }

  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { connectionId: string; calleeId: string },
  ) {
    if (!socket.userId) return;

    // Verify users are matched
    const match = await this.prisma.connection.findFirst({
      where: {
        id: data.connectionId,
        OR: [
          { user1Id: socket.userId, user2Id: data.calleeId },
          { user1Id: data.calleeId, user2Id: socket.userId },
        ],
        status: 'ACTIVE',
        connectionType: ConnectionType.BROTHERS_IN_ARMS,
      },
    });
    const turnCredentials = this.getTurnCredentials();
    const iceServers = turnCredentials ? [turnCredentials] : [];

    if (!match) {
      socket.emit('call:error', { message: 'Cannot call this user' });
      return;
    }

    // Check if callee is online
    const calleeSocketIds = this.getSocketIds(data.calleeId);
    if (calleeSocketIds.length === 0) {
      socket.emit('call:error', { message: 'User is not available for video call' });
      return;
    }

    // Check if either user is already in a call
    for (const session of this.activeCalls.values()) {
      if (session.callerId === socket.userId || session.calleeId === socket.userId ||
          session.callerId === data.calleeId || session.calleeId === data.calleeId) {
        socket.emit('call:error', { message: 'User is already in a call' });
        return;
      }
    }

    // Create call session
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: CallSession = {
      callerId: socket.userId,
      calleeId: data.calleeId,
      connectionId: data.connectionId,
      status: 'ringing',
      startedAt: new Date(),
      iceServers,
    };

    this.activeCalls.set(callId, session);

    // Get caller info
    const caller = await this.prisma.user.findUnique({
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

    // Notify callee
    this.emitToUser(data.calleeId, 'call:incoming', {
      callId,
      callerId: socket.userId,
      callerName: caller?.profile?.displayName || 'Unknown',
      callerImage: caller?.profile?.profileImageUrl,
      connectionId: data.connectionId,
      iceServers: session.iceServers,
    });

    // Confirm to caller
    socket.emit('call:ringing', { callId, iceServers: session.iceServers });

    // Auto-end call after 30 seconds if not answered
    const timeout = setTimeout(() => {
      const call = this.activeCalls.get(callId);
      if (call && call.status === 'ringing') {
        this.endCall(callId, 'no_answer');
      }
    }, 30000);
    timeout.unref?.();
    this.callTimeouts.set(callId, timeout);
  }

  /**
   * Accept incoming call
   */
  @SubscribeMessage('call:accept')
  async handleCallAccept(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    if (!socket.userId) return;

    const session = this.activeCalls.get(data.callId);
    if (!session || session.calleeId !== socket.userId) {
      socket.emit('call:error', { message: 'Invalid call' });
      return;
    }

    session.status = 'connected';

    if (this.getSocketIds(session.callerId).length > 0) {
      this.emitToUser(session.callerId, 'call:accepted', {
        callId: data.callId,
        iceServers: session.iceServers,
      });
    }

    this.emitToUser(session.calleeId, 'call:connected', {
      callId: data.callId,
      iceServers: session.iceServers,
    });
  }

  /**
   * Reject incoming call
   */
  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    if (!socket.userId) return;

    const session = this.activeCalls.get(data.callId);
    if (!session || session.calleeId !== socket.userId) {
      return;
    }

    this.endCall(data.callId, 'rejected');
  }

  /**
   * End call
   */
  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    if (!socket.userId) return;

    const session = this.activeCalls.get(data.callId);
    if (!session) return;

    if (session.callerId !== socket.userId && session.calleeId !== socket.userId) {
      return;
    }

    this.endCall(data.callId, 'ended');
  }

  /**
   * WebRTC signaling - offer
   */
  @SubscribeMessage('webrtc:offer')
  async handleOffer(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { callId: string; offer: RTCSessionDescriptionInit },
  ) {
    if (!socket.userId) return;

    const session = this.activeCalls.get(data.callId);
    if (!session) return;

    const targetId = session.callerId === socket.userId ? session.calleeId : session.callerId;
    if (this.getSocketIds(targetId).length > 0) {
      this.emitToUser(targetId, 'webrtc:offer', {
        callId: data.callId,
        offer: data.offer,
      });
    }
  }

  /**
   * WebRTC signaling - answer
   */
  @SubscribeMessage('webrtc:answer')
  async handleAnswer(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { callId: string; answer: RTCSessionDescriptionInit },
  ) {
    if (!socket.userId) return;

    const session = this.activeCalls.get(data.callId);
    if (!session) return;

    const targetId = session.callerId === socket.userId ? session.calleeId : session.callerId;
    if (this.getSocketIds(targetId).length > 0) {
      this.emitToUser(targetId, 'webrtc:answer', {
        callId: data.callId,
        answer: data.answer,
      });
    }
  }

  /**
   * WebRTC signaling - ICE candidate
   */
  @SubscribeMessage('webrtc:ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { callId: string; candidate: RTCIceCandidateInit },
  ) {
    if (!socket.userId) return;

    const session = this.activeCalls.get(data.callId);
    if (!session) return;

    const targetId = session.callerId === socket.userId ? session.calleeId : session.callerId;
    if (this.getSocketIds(targetId).length > 0) {
      this.emitToUser(targetId, 'webrtc:ice-candidate', {
        callId: data.callId,
        candidate: data.candidate,
      });
    }
  }

  /**
   * Helper to end a call and notify both parties
   */
  private endCall(callId: string, reason: string) {
    const session = this.activeCalls.get(callId);
    if (!session) return;

    const timeout = this.callTimeouts.get(callId);
    if (timeout) {
      clearTimeout(timeout);
      this.callTimeouts.delete(callId);
    }

    this.emitToUser(session.callerId, 'call:ended', { callId, reason });
    this.emitToUser(session.calleeId, 'call:ended', { callId, reason });

    this.activeCalls.delete(callId);
    this.logger.log(`Call ${callId} ended: ${reason}`);
  }

  /**
   * Check if user is available for video call
   */
  isUserAvailable(userId: string): boolean {
    if (this.getSocketIds(userId).length === 0) return false;

    // Check if user is already in a call
    for (const session of this.activeCalls.values()) {
      if (session.callerId === userId || session.calleeId === userId) {
        return false;
      }
    }

    return true;
  }
}
