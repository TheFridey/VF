import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.validation';

// Core modules
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { VeteransModule } from './veterans/veterans.module';
import { VerificationModule } from './verification/verification.module';
import { BrothersModule } from './brothers/brothers.module';
import { ConnectionsModule } from './connections/connections.module';
import { MessagingModule } from './messaging/messaging.module';
import { ModerationModule } from './moderation/moderation.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { GdprModule } from './gdpr/gdpr.module';
import { HealthModule } from './health/health.module';
import { UploadsModule } from './uploads/uploads.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VideoModule } from './video/video.module';
import { BiaModule } from './bia/bia.module';
import { EmailModule } from './email/email.module';
import { AnalyticsModule } from './analytics/analytics.module';

// Guards
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),

    // Core infrastructure
    PrismaModule,
    RedisModule,

    // Cron / task scheduling — required by VerificationService SLA cron
    ScheduleModule.forRoot(),

    // Rate limiting — three tiers: burst (1s), burst-medium (10s), sustained (60s)
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 10  },
      { name: 'medium', ttl: 10000, limit: 60  },
      { name: 'long',   ttl: 60000, limit: 300 },
    ]),

    // Feature modules
    AuthModule,
    UsersModule,
    ProfilesModule,
    VeteransModule,
    VerificationModule,
    BrothersModule,
    ConnectionsModule,
    MessagingModule,
    ModerationModule,
    AdminModule,
    AuditModule,
    GdprModule,
    HealthModule,
    UploadsModule,
    SubscriptionsModule,
    NotificationsModule,
    VideoModule,
    BiaModule,
    EmailModule,
    AnalyticsModule,
  ],
  providers: [
    // IP-based rate limiting applied globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Per-user rate limiting is applied per-controller via @UseGuards(UserThrottlerGuard)
    // rather than globally, because unauthenticated routes have no user context.
    // See: apps/api/src/common/guards/user-throttler.guard.ts
  ],
})
export class AppModule {}
