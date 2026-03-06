import { Module } from '@nestjs/common';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [GdprController],
  providers: [GdprService],
  exports: [GdprService],
})
export class GdprModule {}
