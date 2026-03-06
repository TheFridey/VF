import { Controller, Get, Put, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/profile.dto';

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.profilesService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() data: UpdateProfileDto) {
    return this.profilesService.updateProfile(userId, data);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update own profile (PUT)' })
  async updateProfilePut(@CurrentUser('id') userId: string, @Body() data: UpdateProfileDto) {
    return this.profilesService.updateProfile(userId, data);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get public profile' })
  async getPublicProfile(
    @CurrentUser('id') viewerId: string,
    @Param('userId') userId: string,
  ) {
    return this.profilesService.getPublicProfile(userId, viewerId);
  }
}
