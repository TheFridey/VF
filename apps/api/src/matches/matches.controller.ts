import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MatchesService } from './matches.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('matches')
@ApiBearerAuth()
@Controller('matches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all matches for current user' })
  async getMatches(@CurrentUser('id') userId: string) {
    return this.matchesService.getMatches(userId);
  }

  @Get('stats')
  @Roles('MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get match statistics (Admin/Moderator)' })
  async getStats() {
    return this.matchesService.getMatchStats();
  }

  @Get(':matchId')
  @ApiOperation({ summary: 'Get a specific match' })
  async getMatch(
    @CurrentUser('id') userId: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ) {
    return this.matchesService.getMatch(matchId, userId);
  }

  @Delete(':matchId')
  @ApiOperation({ summary: 'Unmatch from a user' })
  async unmatch(
    @CurrentUser('id') userId: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ) {
    return this.matchesService.unmatch(matchId, userId);
  }
}
