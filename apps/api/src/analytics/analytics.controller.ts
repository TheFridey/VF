import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AnalyticsService } from './analytics.service';
import { GetAnalyticsSummaryDto, TrackAnalyticsEventDto, TrackPageViewDto } from './dto/analytics.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Post('page-view')
  @ApiOperation({ summary: 'Track an anonymous or authenticated page view' })
  async trackPageView(@Body() dto: TrackPageViewDto) {
    return this.analyticsService.trackPageView(dto);
  }

  @Public()
  @Post('event')
  @ApiOperation({ summary: 'Track a lightweight analytics event' })
  async trackEvent(@Body() dto: TrackAnalyticsEventDto) {
    return this.analyticsService.trackEvent(dto);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics summary for admins' })
  async getSummary(@Query() dto: GetAnalyticsSummaryDto) {
    return this.analyticsService.getSummary(dto.days ?? 30);
  }
}
