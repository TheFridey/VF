import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  public readonly client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // Basic operations
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

  // Session management
  async setSession(userId: string, sessionData: object, ttlSeconds: number): Promise<void> {
    const key = `session:${userId}`;
    await this.set(key, JSON.stringify(sessionData), ttlSeconds);
  }

  async getSession(userId: string): Promise<object | null> {
    const key = `session:${userId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(userId: string): Promise<void> {
    const key = `session:${userId}`;
    await this.del(key);
  }

  // Refresh token management
  async setRefreshToken(token: string, userId: string, ttlSeconds: number): Promise<void> {
    const key = `refresh:${token}`;
    await this.set(key, userId, ttlSeconds);
  }

  async getRefreshTokenUserId(token: string): Promise<string | null> {
    const key = `refresh:${token}`;
    return this.get(key);
  }

  async deleteRefreshToken(token: string): Promise<void> {
    const key = `refresh:${token}`;
    await this.del(key);
  }

  // Rate limiting helpers
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

  // Cache helpers
  async cacheSet<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    await this.set(`cache:${key}`, JSON.stringify(data), ttlSeconds);
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    const data = await this.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async cacheInvalidate(pattern: string): Promise<void> {
    const keys = await this.client.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // Account lockout
  async incrementLoginAttempts(email: string): Promise<number> {
    const key = `login_attempts:${email}`;
    const count = await this.incrementRateLimit(key, 900); // 15 minutes
    return count;
  }

  async getLoginAttempts(email: string): Promise<number> {
    const key = `login_attempts:${email}`;
    return this.getRateLimit(key);
  }

  async clearLoginAttempts(email: string): Promise<void> {
    const key = `login_attempts:${email}`;
    await this.del(key);
  }

  async isAccountLocked(email: string): Promise<boolean> {
    const attempts = await this.getLoginAttempts(email);
    return attempts >= 5;
  }

  // Key pattern matching
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }
}
