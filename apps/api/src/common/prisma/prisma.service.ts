import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  // Soft delete helper for models with deletedAt field
  async softDelete(model: string, id: string) {
    return (this as any)[model].update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Find with soft delete filter
  async findActive(model: string, where: any = {}) {
    return (this as any)[model].findMany({
      where: {
        ...where,
        deletedAt: null,
      },
    });
  }

  // Clean up expired verification evidence (GDPR compliance)
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

  // Clean up expired sessions
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

  // Unban users whose suspension has expired
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
