import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

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
import { MatchesModule } from './matches/matches.module';
import { MessagingModule } from './messaging/messaging.module';
import { ModerationModule } from './moderation/moderation.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { StorageModule } from './storage/storage.module';
import { GdprModule } from './gdpr/gdpr.module';
import { HealthModule } from './health/health.module';
import { UploadsModule } from './uploads/uploads.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VideoModule } from './video/video.module';

// Guards
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Core infrastructure
    PrismaModule,
    RedisModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Feature modules
    AuthModule,
    UsersModule,
    ProfilesModule,
    VeteransModule,
    VerificationModule,
    BrothersModule,
    MatchesModule,
    MessagingModule,
    ModerationModule,
    AdminModule,
    AuditModule,
    StorageModule,
    GdprModule,
    HealthModule,
    UploadsModule,
    SubscriptionsModule,
    NotificationsModule,
    VideoModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
