import { Module } from '@nestjs/common';
import { BrothersController } from './brothers.controller';
import { BrothersService } from './brothers.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BrothersController],
  providers: [BrothersService],
  exports: [BrothersService],
})
export class BrothersModule {}
