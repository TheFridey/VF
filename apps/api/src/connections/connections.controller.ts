import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('connections')
@ApiBearerAuth()
@Controller('connections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConnectionsController {
  constructor(private connectionsService: ConnectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all connections for current user' })
  async getConnections(@CurrentUser('id') userId: string) {
    return this.connectionsService.getConnections(userId);
  }

  @Get('stats')
  @Roles('MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get match statistics (Admin/Moderator)' })
  async getStats() {
    return this.connectionsService.getMatchStats();
  }

  @Get(':connectionId')
  @ApiOperation({ summary: 'Get a specific connection' })
  async getMatch(
    @CurrentUser('id') userId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
  ) {
    return this.connectionsService.getConnection(connectionId, userId);
  }

  @Delete(':connectionId')
  @ApiOperation({ summary: 'Unmatch from a user' })
  async removeConnection(
    @CurrentUser('id') userId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
  ) {
    return this.connectionsService.removeConnection(connectionId, userId);
  }
}
