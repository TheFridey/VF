import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BiaController } from './bia.controller';
import { BiaService } from './bia.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { RedisModule } from '../common/redis/redis.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    PrismaModule,
    SubscriptionsModule,
    RedisModule,
    UploadsModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
      },
    }),
  ],
  controllers: [BiaController],
  providers: [BiaService],
  exports: [BiaService],
})
export class BiaModule {}
