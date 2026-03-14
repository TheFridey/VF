import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BrothersService } from './brothers.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('brothers')
@ApiBearerAuth()
@Controller('brothers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrothersController {
  constructor(private brothersService: BrothersService) {}

  @Get('search')
  @Roles('VETERAN_VERIFIED', 'VETERAN_MEMBER', 'MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Search for potential Brothers in Arms connections' })
  async searchBrothers(
    @CurrentUser('id') userId: string,
    @Query() filters: any,
  ) {
    return this.brothersService.searchBrothers(userId, filters);
  }

  @Get('requests')
  @Roles('VETERAN_VERIFIED', 'VETERAN_MEMBER', 'MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get pending connection requests' })
  async getRequests(@CurrentUser('id') userId: string) {
    return this.brothersService.getConnectionRequests(userId);
  }

  @Post('requests/:requestId/respond')
  @Roles('VETERAN_VERIFIED', 'VETERAN_MEMBER', 'MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Respond to a connection request' })
  async respondToRequest(
    @CurrentUser('id') userId: string,
    @Param('requestId') requestId: string,
    @Body('accept') accept: boolean,
  ) {
    return this.brothersService.respondToRequest(userId, requestId, accept);
  }

  @Post(':userId/connect')
  @Roles('VETERAN_VERIFIED', 'VETERAN_MEMBER', 'MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Send connection request to another veteran' })
  async sendConnectionRequest(
    @CurrentUser('id') userId: string,
    @Param('userId') targetUserId: string,
    @Body('message') message?: string,
  ) {
    return this.brothersService.sendConnectionRequest(userId, targetUserId, message);
  }

  @Post('connect')
  @Roles('VETERAN_VERIFIED', 'VETERAN_MEMBER', 'MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Connect with another veteran (legacy)' })
  async connectWithBrother(
    @CurrentUser('id') userId: string,
    @Body('targetUserId') targetUserId: string,
  ) {
    return this.brothersService.connectWithBrother(userId, targetUserId);
  }

  @Get('connections')
  @Roles('VETERAN_VERIFIED', 'VETERAN_MEMBER', 'MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get my brother connections' })
  async getConnections(@CurrentUser('id') userId: string) {
    return this.brothersService.getBrotherConnections(userId);
  }
}
