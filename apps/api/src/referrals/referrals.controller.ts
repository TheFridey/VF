import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReferralsService } from './referrals.service';
import { RecordReferralShareDto } from './dto/referrals.dto';

@ApiTags('referrals')
@ApiBearerAuth()
@Controller('referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('me')
  @Roles('VETERAN_VERIFIED', 'VETERAN_MEMBER', 'MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get referral invite hub and reward progress' })
  async getMyReferralHub(@CurrentUser('id') userId: string) {
    return this.referralsService.getReferralHub(userId);
  }

  @Post('me/code')
  @Roles('VETERAN_VERIFIED', 'VETERAN_MEMBER', 'MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Ensure the current user has a referral code' })
  async ensureCode(@CurrentUser('id') userId: string) {
    return this.referralsService.ensureCode(userId);
  }

  @Post('share')
  @Roles('VETERAN_VERIFIED', 'VETERAN_MEMBER', 'MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Record a referral invite share action and return updated stats' })
  async recordShare(
    @CurrentUser('id') userId: string,
    @Body() dto: RecordReferralShareDto,
  ) {
    return this.referralsService.recordShare(userId, dto);
  }
}
