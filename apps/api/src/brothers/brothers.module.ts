import { Module } from '@nestjs/common';
import { BrothersController } from './brothers.controller';
import { BrothersService } from './brothers.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, RedisModule, NotificationsModule],
  controllers: [BrothersController],
  providers: [BrothersService],
  exports: [BrothersService],
})
export class BrothersModule {}
