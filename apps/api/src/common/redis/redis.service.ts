import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  public readonly client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // ── Basic operations ───────────────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  // ── Session management ─────────────────────────────────────────────────────

  async setSession(userId: string, sessionData: object, ttlSeconds: number): Promise<void> {
    await this.set(`session:${userId}`, JSON.stringify(sessionData), ttlSeconds);
  }

  async getSession(userId: string): Promise<object | null> {
    const data = await this.get(`session:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(userId: string): Promise<void> {
    await this.del(`session:${userId}`);
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────

  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    const multi = this.client.multi();
    multi.incr(key);
    multi.expire(key, windowSeconds);
    const results = await multi.exec();
    return results ? (results[0][1] as number) : 0;
  }

  async getRateLimit(key: string): Promise<number> {
    const result = await this.client.get(key);
    return result ? parseInt(result, 10) : 0;
  }

  // ── Cache helpers ──────────────────────────────────────────────────────────

  async cacheSet<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    await this.set(`cache:${key}`, JSON.stringify(data), ttlSeconds);
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    const data = await this.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Invalidate all cache keys matching a prefix pattern.
   *
   * ── Why SCAN instead of KEYS ─────────────────────────────────────────────
   * KEYS is O(N) and blocks the Redis event loop for the entire scan duration.
   * On a busy server with millions of keys this causes latency spikes that
   * affect every other Redis command for that duration.
   *
   * SCAN iterates in small batches (cursor-based), yielding between each batch
   * so other commands can be served.  It is also the only safe approach for
   * Redis Cluster, where KEYS is not supported across slots.
   *
   * The trade-off: SCAN can see newly-created keys added after the scan
   * started (they may or may not be deleted).  For cache invalidation this is
   * acceptable — a small window of stale data is better than blocking the
   * event loop.
   */
  async cacheInvalidate(pattern: string): Promise<void> {
    const fullPattern = `cache:${pattern}`;
    const keysToDelete: string[] = [];
    let cursor = '0';

    do {
      // SCAN returns [nextCursor, keys[]]
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH', fullPattern,
        'COUNT', 100, // process up to 100 per iteration — tunable
      );
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    if (keysToDelete.length > 0) {
      // DEL accepts multiple keys — single round trip
      await this.client.del(...keysToDelete);
    }
  }

  // ── Account lockout ────────────────────────────────────────────────────────

  async incrementLoginAttempts(email: string): Promise<number> {
    return this.incrementRateLimit(`login_attempts:${email}`, 900); // 15 min
  }

  async getLoginAttempts(email: string): Promise<number> {
    return this.getRateLimit(`login_attempts:${email}`);
  }

  async clearLoginAttempts(email: string): Promise<void> {
    await this.del(`login_attempts:${email}`);
  }

  async isAccountLocked(email: string): Promise<boolean> {
    const attempts = await this.getLoginAttempts(email);
    return attempts >= 5;
  }

  // ── Per-user API rate limiting ─────────────────────────────────────────────
  // Used by UserThrottlerGuard in addition to IP-based NestJS throttling.
  // Provides protection against multi-IP attacks from a single authenticated user.

  /**
   * Increment a per-user rate limit counter and return the new count.
   * Key format: `user_rate:<userId>:<windowKey>` where windowKey is typically
   * the current minute bucket (Math.floor(Date.now() / 60000)).
   */
  async incrementUserRate(userId: string, windowKey: string, windowSeconds: number): Promise<number> {
    return this.incrementRateLimit(`user_rate:${userId}:${windowKey}`, windowSeconds);
  }

  async getUserRate(userId: string, windowKey: string): Promise<number> {
    return this.getRateLimit(`user_rate:${userId}:${windowKey}`);
  }

  // ── SLA alert deduplication ────────────────────────────────────────────────
  // Prevents the SLA breach cron from sending duplicate alert emails.

  async setSlaAlertSent(requestId: string): Promise<void> {
    // TTL 7 days — long enough to cover the review window, avoids unbounded growth
    await this.set(`sla_alert:${requestId}`, '1', 7 * 24 * 3600);
  }

  async isSlaAlertSent(requestId: string): Promise<boolean> {
    return this.exists(`sla_alert:${requestId}`);
  }

  // ── Generic key pattern matching (SCAN-based) ──────────────────────────────

  async scanKeys(pattern: string): Promise<string[]> {
    const found: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      found.push(...keys);
    } while (cursor !== '0');
    return found;
  }

  // Kept for backward compatibility — delegates to SCAN internally
  async keys(pattern: string): Promise<string[]> {
    return this.scanKeys(pattern);
  }
}
