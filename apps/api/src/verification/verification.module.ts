import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    UploadsModule,
    AuditModule,
    EmailModule,
    RedisModule,           // required by VerificationService for SLA alert deduplication
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 200 * 1024 * 1024, // 200MB (video files)
        files: 3,                    // up from 2 — support photo + doc + video
      },
    }),
  ],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
