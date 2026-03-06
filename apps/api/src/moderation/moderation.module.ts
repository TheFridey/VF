import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
