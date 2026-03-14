/**
 * Video Gateway unit tests
 * Covers: auth handshake, call initiation, permission checks, disconnect cleanup.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { io, Socket } from 'socket.io-client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { VideoGateway } from './video.gateway';
import { PrismaService } from '../common/prisma/prisma.service';

const SECRET = 'test-secret-at-least-32-chars-long-ok!';
const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  connection: { findFirst: jest.fn() },
};

describe('VideoGateway', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let gateway: VideoGateway;
  let port: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoGateway,
        { provide: JwtService, useValue: new JwtService({ secret: SECRET }) },
        { provide: ConfigService, useValue: { get: (k: string, fb?: any) => k === 'JWT_SECRET' ? SECRET : fb } },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.init();
    const httpServer = app.getHttpServer();
    await new Promise<void>((r) => httpServer.listen(0, r));
    port = httpServer.address().port;
    jwtService = module.get(JwtService);
    gateway = module.get(VideoGateway);
  });

  afterAll(async () => { await app.close(); });
  beforeEach(() => jest.clearAllMocks());

  const sign = (uid: string) => jwtService.sign({ sub: uid, email: 't@t.com' });
  const connect = (token?: string): Promise<Socket> =>
    new Promise((res, rej) => {
      const s = io(`http://localhost:${port}/video`, {
        auth: token ? { token } : {},
        transports: ['websocket'],
        timeout: 3000,
      });
      s.on('connect', () => res(s));
      s.on('connect_error', rej);
    });

  it('connects with valid JWT', async () => {
    const s = await connect(sign('v1'));
    expect(s.connected).toBe(true);
    s.disconnect();
  });

  it('rejects connection without token', async () => {
    await expect(connect()).rejects.toBeDefined();
  });

  it('rejects expired token', async () => {
    const exp = jwtService.sign({ sub: 'exp', email: 'x@x.com' }, { expiresIn: '-1s' });
    await expect(connect(exp)).rejects.toBeDefined();
  });

  it('signals incoming call to online callee', async () => {
    const callerId = 'v-caller'; const calleeId = 'v-callee';
    mockPrisma.connection.findFirst.mockResolvedValueOnce({
      id: 'vc1', status: 'ACTIVE', user1Id: callerId, user2Id: calleeId,
    });
    const caller = await connect(sign(callerId));
    const callee = await connect(sign(calleeId));
    await new Promise((r) => setTimeout(r, 100));
    const incoming = new Promise<any>((r) => callee.on('call:incoming', r));
    caller.emit('call:initiate', { calleeId, connectionId: 'vc1' });
    const evt = await Promise.race([incoming, new Promise((_, j) => setTimeout(() => j(new Error('timeout')), 2000))]);
    expect(evt?.callerId).toBe(callerId);
    caller.disconnect(); callee.disconnect();
  });

  it('removes user from connectedUsers on disconnect', async () => {
    const uid = 'v-disc';
    const s = await connect(sign(uid));
    await new Promise((r) => setTimeout(r, 100));
    expect(gateway['connectedUsers'].has(uid)).toBe(true);
    s.disconnect();
    await new Promise((r) => setTimeout(r, 200));
    expect(gateway['connectedUsers'].has(uid)).toBe(false);
  });
});
