import { Controller, Get, Put, Post, Patch, Delete, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VeteransService } from './veterans.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';

@ApiTags('veterans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('veterans')
export class VeteransController {
  constructor(private veteransService: VeteransService) {}

  private checkVeteranRole(role: string) {
    const veteranRoles = ['VETERAN_UNVERIFIED', 'VETERAN_VERIFIED', 'VETERAN_MEMBER'];
    if (!veteranRoles.includes(role)) {
      throw new ForbiddenException('Veteran role required');
    }
  }

  @Get('me')
  @ApiOperation({ summary: 'Get veteran details' })
  async getVeteranDetails(@CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    this.checkVeteranRole(role);
    return this.veteransService.getVeteranDetails(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update veteran details' })
  async updateVeteranDetails(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() data: any,
  ) {
    this.checkVeteranRole(role);
    return this.veteransService.updateVeteranDetails(userId, data);
  }

  @Get('me/service-periods')
  @ApiOperation({ summary: 'Get service periods' })
  async getServicePeriods(@CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    this.checkVeteranRole(role);
    const details = await this.veteransService.getVeteranDetails(userId);
    return details?.servicePeriods || [];
  }

  @Post('me/service-periods')
  @ApiOperation({ summary: 'Add service period' })
  async addServicePeriod(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() data: any,
  ) {
    this.checkVeteranRole(role);
    return this.veteransService.addServicePeriod(userId, data);
  }

  @Patch('me/service-periods/:id')
  @ApiOperation({ summary: 'Update service period' })
  async updateServicePeriod(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    this.checkVeteranRole(role);
    return this.veteransService.updateServicePeriod(userId, id, data);
  }

  @Delete('me/service-periods/:id')
  @ApiOperation({ summary: 'Delete service period' })
  async deleteServicePeriod(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
  ) {
    this.checkVeteranRole(role);
    await this.veteransService.deleteServicePeriod(userId, id);
    return { success: true };
  }
}
