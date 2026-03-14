import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { RedisService } from '../redis/redis.service';
import { Reflector } from '@nestjs/core';

/**
 * UserThrottlerGuard — per-user rate limiting layered on top of NestJS's
 * built-in IP-based ThrottlerGuard.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * IP-based throttling is bypassed trivially by an attacker rotating IPs
 * (VPNs, proxies, botnets).  A single malicious user account could hammer
 * the API from hundreds of IPs and never hit the per-IP limit.
 *
 * Per-user throttling adds a second layer: once a user (identified by their
 * JWT sub) exceeds the limit within the window, all their requests are blocked
 * regardless of which IP they come from.
 *
 * ── Limits ──────────────────────────────────────────────────────────────────
 * 300 requests / 60 seconds per authenticated user.
 * This is generous for normal browsing but catches automated abuse.
 * Unauthenticated requests fall through to the standard IP-based throttler.
 *
 * ── Implementation note ─────────────────────────────────────────────────────
 * We do NOT extend ThrottlerGuard here because ThrottlerGuard's storage is
 * designed for in-process or Redis adapters with specific key formats.
 * Instead we implement CanActivate directly and call our RedisService, which
 * already uses SCAN-safe patterns throughout.
 */
@Injectable()
export class UserThrottlerGuard {
  private readonly USER_LIMIT = 300;
  private readonly WINDOW_SECONDS = 60;

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string } | undefined;

    // Unauthenticated — let the IP-based throttler handle it
    if (!user?.id) return true;

    // Window key: current 60-second bucket
    const windowKey = String(Math.floor(Date.now() / (this.WINDOW_SECONDS * 1000)));
    const count = await this.redis.incrementUserRate(user.id, windowKey, this.WINDOW_SECONDS);

    if (count > this.USER_LIMIT) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please slow down.',
          retryAfter: this.WINDOW_SECONDS,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
