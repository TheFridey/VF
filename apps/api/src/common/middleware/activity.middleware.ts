import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ActivityMiddleware — updates lastActiveAt + isOnline on the User row.
 *
 * ── Why the original version was causing P2024 connection-pool exhaustion ──
 * The previous implementation fired an unawaited prisma.user.update() on
 * EVERY authenticated HTTP request with no real debounce — just a comment
 * claiming debounce existed.  Under any meaningful request rate this generates
 * a continuous stream of database writes, each holding a connection from the
 * pool for the duration of the UPDATE round-trip.  Combined with the event-
 * emitter connection leak in PrismaService, the pool hit its limit and all
 * subsequent queries timed out with P2024.
 *
 * ── Fix ──
 * Real Redis-backed debounce: we write a key `activity:<userId>` with a 60-
 * second TTL on the first request.  While that key exists we skip the DB
 * write entirely.  Only when the key has expired (i.e. the user has been
 * quiet for ≥ 60 s) do we write to the database again.  This reduces DB
 * writes from O(requests) to O(active-users / 60s) — a reduction of several
 * orders of magnitude under normal traffic.
 *
 * The DB write itself is still fire-and-forget (we don't want to add latency
 * to every request) but it only fires at most once per user per 60 seconds.
 */
@Injectable()
export class ActivityMiddleware implements NestMiddleware {
  private static readonly DEBOUNCE_TTL_SECONDS = 60;
  private static readonly KEY_PREFIX = 'activity:';

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const user = (req as Request & { user?: { id?: string } }).user;

    if (user?.id) {
      const userId = user.id;
      const key = `${ActivityMiddleware.KEY_PREFIX}${userId}`;

      // Check Redis without blocking the request — fire-and-forget
      this.redis.exists(key).then((recentlyUpdated) => {
        if (recentlyUpdated) return; // already updated within the last 60 s

        // Mark as recently updated BEFORE the DB write to prevent concurrent
        // requests from racing through while the UPDATE is in flight.
        this.redis.set(key, '1', ActivityMiddleware.DEBOUNCE_TTL_SECONDS).catch(() => {});

        // Write to DB — fire-and-forget, errors are swallowed intentionally.
        // This is non-critical telemetry; it must never delay or fail a request.
        this.prisma.user
          .update({
            where: { id: userId },
            data: { lastActiveAt: new Date(), isOnline: true },
          })
          .catch(() => {
            // If the DB write fails, remove the Redis key so the next request
            // retries rather than silently dropping the update permanently.
            this.redis.del(key).catch(() => {});
          });
      }).catch(() => {
        // Redis unavailable — skip activity update entirely rather than
        // hammering the DB with every request.
      });
    }

    next();
  }
}
