import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
