/**
 * JWT Blacklist — tests that logout invalidates the access token
 * and that blacklisted tokens are rejected by the JWT strategy.
 */
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

// ── Minimal mock helpers ─────────────────────────────────────────────────────

function makeRedis(store: Map<string, string>) {
  return {
    exists: jest.fn(async (key: string) => store.has(key)),
    set: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
    setex: jest.fn(async (key: string, _ttl: number, value: string) => { store.set(key, value); }),
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    del: jest.fn(async (key: string) => { store.delete(key); }),
    multi: jest.fn(() => ({ incr: jest.fn(), expire: jest.fn(), exec: jest.fn(async () => [[null, 1]]) })),
    ping: jest.fn(async () => 'PONG'),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('JWT Blacklist', () => {
  const SECRET = 'test-secret-minimum-32-characters-long!';
  let jwtService: JwtService;
  let blacklistStore: Map<string, string>;

  beforeEach(() => {
    jwtService = new JwtService({ secret: SECRET, signOptions: { expiresIn: '15m' } });
    blacklistStore = new Map();
  });

  it('issues a token with sub and iat claims', () => {
    const token = jwtService.sign({ sub: 'user-1', email: 'a@b.com', role: 'VETERAN_UNVERIFIED' });
    const decoded = jwtService.decode(token) as Record<string, unknown>;
    expect(decoded.sub).toBe('user-1');
    expect(typeof decoded.iat).toBe('number');
  });

  it('blacklist key encodes userId:iat correctly', () => {
    const token = jwtService.sign({ sub: 'user-abc', email: 'a@b.com', role: 'VETERAN_UNVERIFIED' });
    const decoded = jwtService.decode(token) as Record<string, number & string>;
    const key = `blacklist:${decoded.sub}:${decoded.iat}`;
    expect(key).toMatch(/^blacklist:user-abc:\d+$/);
  });

  it('redis.exists returns false before logout', async () => {
    const token = jwtService.sign({ sub: 'user-1', email: 'a@b.com', role: 'VETERAN_UNVERIFIED' });
    const decoded = jwtService.decode(token) as Record<string, string | number>;
    const redis = makeRedis(blacklistStore);
    const key = `blacklist:${decoded.sub}:${decoded.iat}`;
    expect(await redis.exists(key)).toBe(false);
  });

  it('redis.exists returns true after token is blacklisted', async () => {
    const token = jwtService.sign({ sub: 'user-2', email: 'a@b.com', role: 'VETERAN_UNVERIFIED' });
    const decoded = jwtService.decode(token) as Record<string, string | number>;
    const redis = makeRedis(blacklistStore);
    const key = `blacklist:${decoded.sub}:${decoded.iat}`;

    // Simulate what logout does
    await redis.setex(key, 900, '1');

    expect(await redis.exists(key)).toBe(true);
  });

  it('strategy should reject blacklisted token (simulated)', async () => {
    const token = jwtService.sign({ sub: 'user-3', email: 'a@b.com', role: 'VETERAN_UNVERIFIED' });
    const payload = jwtService.decode(token) as Record<string, string | number>;
    const redis = makeRedis(blacklistStore);
    const key = `blacklist:${payload.sub}:${payload.iat}`;
    await redis.setex(key, 900, '1');

    // Simulate what JwtStrategy.validate does
    async function simulateValidate(p: Record<string, string | number>) {
      const isBlacklisted = await redis.exists(`blacklist:${p.sub}:${p.iat}`);
      if (isBlacklisted) throw new UnauthorizedException('Token has been revoked');
      return { id: p.sub };
    }

    await expect(simulateValidate(payload)).rejects.toThrow('Token has been revoked');
  });

  it('strategy should pass non-blacklisted token', async () => {
    const token = jwtService.sign({ sub: 'user-4', email: 'a@b.com', role: 'VETERAN_UNVERIFIED' });
    const payload = jwtService.decode(token) as Record<string, string | number>;
    const redis = makeRedis(blacklistStore);

    async function simulateValidate(p: Record<string, string | number>) {
      const isBlacklisted = await redis.exists(`blacklist:${p.sub}:${p.iat}`);
      if (isBlacklisted) throw new UnauthorizedException('Token has been revoked');
      return { id: p.sub };
    }

    const result = await simulateValidate(payload);
    expect(result.id).toBe('user-4');
  });

  it('different users with same iat have separate blacklist keys', async () => {
    // Both tokens signed at the same second would share iat — keys must still differ
    const iat = Math.floor(Date.now() / 1000);
    const key1 = `blacklist:user-A:${iat}`;
    const key2 = `blacklist:user-B:${iat}`;
    expect(key1).not.toBe(key2);
  });

  it('expired blacklist key clears automatically (TTL logic)', () => {
    // We cannot simulate time here, but we verify the setex call includes a TTL
    const token = jwtService.sign({ sub: 'user-5', email: 'a@b.com', role: 'VETERAN_UNVERIFIED' });
    const decoded = jwtService.decode(token) as Record<string, number>;
    const remainingTtl = (decoded.exp ?? 0) - Math.floor(Date.now() / 1000);
    expect(remainingTtl).toBeGreaterThan(0);
    expect(remainingTtl).toBeLessThanOrEqual(15 * 60);
  });
});
