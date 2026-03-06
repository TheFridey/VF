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
import { MatchType } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface CallSession {
  callerId: string;
  calleeId: string;
  matchId: string;
  status: 'ringing' | 'connected' | 'ended';
  startedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/video',
})
export class VideoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VideoGateway.name);
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private activeCalls: Map<string, CallSession> = new Map(); // callId -> session

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        socket.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      socket.userId = payload.sub;
      this.connectedUsers.set(socket.userId, socket.id);

      this.logger.log(`Video: User ${socket.userId} connected`);

    } catch (error) {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    // End any active calls
    for (const [callId, session] of this.activeCalls.entries()) {
      if (session.callerId === socket.userId || session.calleeId === socket.userId) {
        this.endCall(callId, 'disconnected');
      }
    }

    this.connectedUsers.delete(socket.userId);
    this.logger.log(`Video: User ${socket.userId} disconnected`);
  }

  /**
   * Initiate a video call
   */
  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; calleeId: string },
  ) {
    if (!socket.userId) return;

    // Verify users are matched
    const match = await this.prisma.match.findFirst({
      where: {
        id: data.matchId,
        OR: [
          { user1Id: socket.userId, user2Id: data.calleeId },
          { user1Id: data.calleeId, user2Id: socket.userId },
        ],
        status: 'ACTIVE',
        matchType: MatchType.BROTHERS,
      },
    });

    if (!match) {
      socket.emit('call:error', { message: 'Cannot call this user' });
      return;
    }

    // Check if callee is online
    const calleeSocketId = this.connectedUsers.get(data.calleeId);
    if (!calleeSocketId) {
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
      matchId: data.matchId,
      status: 'ringing',
      startedAt: new Date(),
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
    this.server.to(calleeSocketId).emit('call:incoming', {
      callId,
      callerId: socket.userId,
      callerName: caller?.profile?.displayName || 'Unknown',
      callerImage: caller?.profile?.profileImageUrl,
      matchId: data.matchId,
    });

    // Confirm to caller
    socket.emit('call:ringing', { callId });

    // Auto-end call after 30 seconds if not answered
    setTimeout(() => {
      const call = this.activeCalls.get(callId);
      if (call && call.status === 'ringing') {
        this.endCall(callId, 'no_answer');
      }
    }, 30000);
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

    const callerSocketId = this.connectedUsers.get(session.callerId);
    if (callerSocketId) {
      this.server.to(callerSocketId).emit('call:accepted', { callId: data.callId });
    }

    socket.emit('call:connected', { callId: data.callId });
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
    const targetSocketId = this.connectedUsers.get(targetId);

    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtc:offer', {
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
    const targetSocketId = this.connectedUsers.get(targetId);

    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtc:answer', {
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
    const targetSocketId = this.connectedUsers.get(targetId);

    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtc:ice-candidate', {
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

    const callerSocketId = this.connectedUsers.get(session.callerId);
    const calleeSocketId = this.connectedUsers.get(session.calleeId);

    if (callerSocketId) {
      this.server.to(callerSocketId).emit('call:ended', { callId, reason });
    }
    if (calleeSocketId) {
      this.server.to(calleeSocketId).emit('call:ended', { callId, reason });
    }

    this.activeCalls.delete(callId);
    this.logger.log(`Call ${callId} ended: ${reason}`);
  }

  /**
   * Check if user is available for video call
   */
  isUserAvailable(userId: string): boolean {
    if (!this.connectedUsers.has(userId)) return false;

    // Check if user is already in a call
    for (const session of this.activeCalls.values()) {
      if (session.callerId === userId || session.calleeId === userId) {
        return false;
      }
    }

    return true;
  }
}
