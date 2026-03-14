import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// ── Pool defaults applied in code ────────────────────────────────────────────
// These values are enforced here so the app works correctly even if the
// operator has not added pool params to DATABASE_URL.  If the URL already
// contains these params they take precedence (Prisma uses URL params first).
//
//   connection_limit  How many physical PG connections the pool may open.
//                     Formula: keep below (postgres.max_connections / num_api_replicas).
//                     Docker-postgres defaults to max_connections=100.
//                     10 per process is safe for dev and a 2-replica prod deploy.
//
//   pool_timeout      Seconds to wait for a free slot before throwing P2024.
//                     20 s is generous; drop to 10 s in production.
//
//   connect_timeout   Seconds for the initial TCP handshake.
//                     10 s handles slow container start-up.
//
const POOL_CONNECTION_LIMIT = 10;
const POOL_TIMEOUT = 20;
const CONNECT_TIMEOUT = 10;

function buildDatasourceUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', String(POOL_CONNECTION_LIMIT));
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', String(POOL_TIMEOUT));
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', String(CONNECT_TIMEOUT));
    }
    return url.toString();
  } catch {
    // Malformed URL — return as-is and let Prisma surface the real error
    return rawUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const datasourceUrl = buildDatasourceUrl(process.env.DATABASE_URL);

    super({
      datasources: { db: { url: datasourceUrl } },

      // ── Logging ─────────────────────────────────────────────────────────────
      // NEVER use { emit: 'event', level: 'query' } without attaching a
      // $on('query', handler) listener.  Prisma opens a dedicated advisory-lock
      // connection for each event emitter and never releases it — one leaked
      // pool slot per instantiation, which was the primary cause of P2024 here.
      //
      // 'stdout' emitters are synchronous and hold zero connections.
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log(
      `Database connected (pool: limit=${POOL_CONNECTION_LIMIT}, ` +
      `timeout=${POOL_TIMEOUT}s, connect_timeout=${CONNECT_TIMEOUT}s)`,
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  // ── Soft delete helper ───────────────────────────────────────────────────

  async softDelete(model: string, id: string) {
    return (this as unknown as Record<string, { update: (args: unknown) => Promise<unknown> }>)[model].update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Find with soft-delete filter ────────────────────────────────────────

  async findActive(model: string, where: Record<string, unknown> = {}) {
    return (this as unknown as Record<string, { findMany: (args: unknown) => Promise<unknown> }>)[model].findMany({
      where: { ...where, deletedAt: null },
    });
  }

  // ── GDPR / scheduled jobs ────────────────────────────────────────────────

  async cleanupExpiredEvidence() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.verificationRequest.updateMany({
      where: {
        status: { in: ['APPROVED', 'REJECTED'] },
        reviewedAt: { lt: thirtyDaysAgo },
        evidenceUrls: { isEmpty: false },
      },
      data: {
        evidenceUrls: [],
        evidenceDeletedAt: new Date(),
      },
    });
  }

  async cleanupExpiredSessions() {
    return this.user.updateMany({
      where: {
        refreshTokenExpiresAt: { lt: new Date() },
        refreshTokenHash: { not: null },
      },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
  }

  async processExpiredSuspensions() {
    return this.user.updateMany({
      where: {
        status: 'SUSPENDED',
        banExpiresAt: { lt: new Date() },
      },
      data: {
        status: 'ACTIVE',
        banExpiresAt: null,
        banReason: null,
      },
    });
  }
}
