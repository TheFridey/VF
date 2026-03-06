import { Module } from '@nestjs/common';
import { BiaController } from './bia.controller';
import { BiaService } from './bia.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [BiaController],
  providers: [BiaService],
  exports: [BiaService],
})
export class BiaModule {}
