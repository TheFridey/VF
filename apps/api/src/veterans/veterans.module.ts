import { Module } from '@nestjs/common';
import { VeteransController } from './veterans.controller';
import { VeteransService } from './veterans.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VeteransController],
  providers: [VeteransService],
  exports: [VeteransService],
})
export class VeteransModule {}
