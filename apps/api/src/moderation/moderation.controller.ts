import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateReportDto,
  ResolveReportDto,
  BulkResolveReportsDto,
  CreateBlockDto,
  GetReportsDto,
} from './dto/moderation.dto';

@ApiTags('moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  // ============ USER ENDPOINTS ============

  @Post('reports')
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @ApiOperation({ summary: 'Report a user' })
  async createReport(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderationService.createReport(userId, dto);
  }

  @Get('reports/mine')
  @ApiOperation({ summary: 'Get my submitted reports' })
  async getMyReports(@CurrentUser('id') userId: string) {
    return this.moderationService.getMyReports(userId);
  }

  @Post('blocks')
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @ApiOperation({ summary: 'Block a user' })
  async blockUser(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBlockDto,
  ) {
    return this.moderationService.blockUser(userId, dto);
  }

  @Delete('blocks/:userId')
  @ApiOperation({ summary: 'Unblock a user' })
  async unblockUser(
    @CurrentUser('id') blockerId: string,
    @Param('userId') blockedUserId: string,
  ) {
    return this.moderationService.unblockUser(blockerId, blockedUserId);
  }

  @Get('blocks')
  @ApiOperation({ summary: 'Get my blocked users list' })
  async getBlockedUsers(@CurrentUser('id') userId: string) {
    return this.moderationService.getBlockedUsers(userId);
  }

  // ============ MODERATOR/ADMIN ENDPOINTS ============

  @Get('reports')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get all reports (moderator+)' })
  async getReports(@Query() dto: GetReportsDto) {
    return this.moderationService.getPendingReports(dto);
  }

  @Post('reports/bulk-resolve')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Resolve multiple reports (moderator+)' })
  async bulkResolveReports(
    @CurrentUser('id') moderatorId: string,
    @Body() dto: BulkResolveReportsDto,
  ) {
    return this.moderationService.bulkResolveReports(moderatorId, dto);
  }

  @Post('reports/:reportId/resolve')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Resolve a report (moderator+)' })
  async resolveReport(
    @CurrentUser('id') moderatorId: string,
    @Param('reportId') reportId: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.moderationService.resolveReport(moderatorId, reportId, dto);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get moderation statistics (moderator+)' })
  async getStats() {
    return this.moderationService.getModerationStats();
  }
}
