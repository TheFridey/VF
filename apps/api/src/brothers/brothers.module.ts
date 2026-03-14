import { Module } from '@nestjs/common';
import { BrothersController } from './brothers.controller';
import { BrothersService } from './brothers.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [BrothersController],
  providers: [BrothersService],
  exports: [BrothersService],
})
export class BrothersModule {}
