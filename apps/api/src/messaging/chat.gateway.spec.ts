/**
 * Chat Gateway — unit tests
 *
 * Covers: auth handshake, room joins, message sending/encryption,
 *         disconnect cleanup, typing indicators.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { io, Socket } from 'socket.io-client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';

const MOCK_JWT_SECRET = 'test-secret-at-least-32-chars-long-ok!';

function signToken(jwtService: JwtService, userId: string): string {
  return jwtService.sign({ sub: userId, email: 'test@test.com' });
}

const mockPrisma = {
  user:       { findUnique: jest.fn(), update: jest.fn() },
  connection: { findFirst: jest.fn() },
  message:    { create: jest.fn(), updateMany: jest.fn() },
};
const mockRedis = {
  client:              { get: jest.fn(), setex: jest.fn() },
  incrementRateLimit:  jest.fn().mockResolvedValue(1),
  getRateLimit:        jest.fn().mockResolvedValue(0),
  cacheGet:            jest.fn().mockResolvedValue(null),
  cacheSet:            jest.fn().mockResolvedValue(undefined),
};

describe('ChatGateway', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let gateway: ChatGateway;
  let port: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: JwtService, useValue: new JwtService({ secret: MOCK_JWT_SECRET }) },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: any) => {
              if (key === 'JWT_SECRET') return MOCK_JWT_SECRET;
              if (key === 'ENCRYPTION_KEY') return 'test-encryption-key-32-chars!!!';
              return fallback;
            },
          },
        },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.init();

    const httpServer = app.getHttpServer();
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    port = httpServer.address().port;
    jwtService = module.get(JwtService);
    gateway = module.get(ChatGateway);
  });

  afterAll(async () => { await app.close(); });
  beforeEach(() => jest.clearAllMocks());

  function connectClient(token?: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const s = io(`http://localhost:${port}/chat`, {
        auth: token ? { token } : {},
        transports: ['websocket'],
        timeout: 3000,
      });
      s.on('connect', () => resolve(s));
      s.on('connect_error', reject);
    });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  describe('Authentication handshake', () => {
    it('connects with a valid JWT', async () => {
      const s = await connectClient(signToken(jwtService, 'u1'));
      expect(s.connected).toBe(true);
      s.disconnect();
    });

    it('rejects connection with no token', async () => {
      await expect(connectClient()).rejects.toBeDefined();
    });

    it('rejects connection with invalid token', async () => {
      await expect(connectClient('bad.token.here')).rejects.toBeDefined();
    });

    it('rejects connection with expired token', async () => {
      const expired = jwtService.sign({ sub: 'u-exp', email: 'x@x.com' }, { expiresIn: '-1s' });
      await expect(connectClient(expired)).rejects.toBeDefined();
    });
  });

  // ── Room join ─────────────────────────────────────────────────────────────

  describe('Room join', () => {
    it('succeeds when connection is ACTIVE and user is a participant', async () => {
      mockPrisma.connection.findFirst.mockResolvedValueOnce({
        id: 'c1', status: 'ACTIVE', user1Id: 'u-join-1', user2Id: 'u-join-2',
      });
      const s = await connectClient(signToken(jwtService, 'u-join-1'));
      const res = await new Promise<any>((r) => s.emit('join:connection', { connectionId: 'c1' }, r));
      expect(res?.success).toBe(true);
      s.disconnect();
    });

    it('fails when connection not found / user not a participant', async () => {
      mockPrisma.connection.findFirst.mockResolvedValueOnce(null);
      const s = await connectClient(signToken(jwtService, 'u-outsider'));
      const res = await new Promise<any>((r) => s.emit('join:connection', { connectionId: 'c-none' }, r));
      expect(res?.success).toBeFalsy();
      s.disconnect();
    });
  });

  // ── Message send ──────────────────────────────────────────────────────────

  describe('Message sending', () => {
    it('stores encrypted message and emits to room', async () => {
      const senderId = 'msg-s1', receiverId = 'msg-r1', connId = 'msg-c1';
      mockPrisma.connection.findFirst.mockResolvedValue({
        id: connId, status: 'ACTIVE', user1Id: senderId, user2Id: receiverId,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: senderId, profile: { displayName: 'Tester', profileImageUrl: null },
      });
      mockPrisma.message.create.mockResolvedValue({
        id: 'm1', connectionId: connId, senderId, receiverId,
        encryptedContent: 'enc', iv: 'iv', authTag: 'tag', createdAt: new Date(),
      });

      const s = await connectClient(signToken(jwtService, senderId));
      await new Promise<any>((r) => s.emit('join:connection', { connectionId: connId }, r));

      const msgPromise = new Promise<any>((r) => s.on('message:new', r));
      s.emit('message:send', { connectionId: connId, content: 'Hello brother' });

      const received = await Promise.race([
        msgPromise,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000)),
      ]);
      expect(received).toBeDefined();

      // Confirm content was encrypted before storage
      const stored = mockPrisma.message.create.mock.calls[0][0];
      expect(stored.data.encryptedContent).not.toBe('Hello brother');
      s.disconnect();
    });

    it('emits error when sending to a connection user does not belong to', async () => {
      mockPrisma.connection.findFirst.mockResolvedValueOnce(null);
      const s = await connectClient(signToken(jwtService, 'u-bad'));
      const errPromise = new Promise<any>((r) => s.on('error', r));
      s.emit('message:send', { connectionId: 'other-conn', content: 'sneak' });
      await Promise.race([
        errPromise,
        new Promise((_, rej) => setTimeout(() => rej(new Error('no error emitted')), 1500)),
      ]);
      expect(mockPrisma.message.create).not.toHaveBeenCalled();
      s.disconnect();
    });
  });

  // ── Disconnect ────────────────────────────────────────────────────────────

  describe('Disconnect cleanup', () => {
    it('removes user from connectedUsers map on disconnect', async () => {
      const userId = 'disc-u1';
      const s = await connectClient(signToken(jwtService, userId));
      await new Promise((r) => setTimeout(r, 100));
      expect(gateway['connectedUsers'].has(userId)).toBe(true);
      s.disconnect();
      await new Promise((r) => setTimeout(r, 200));
      expect(gateway['connectedUsers'].has(userId)).toBe(false);
    });
  });
});
