import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  GetUsersDto,
  UpdateUserStatusDto,
  UpdateUserRoleDto,
  GetAuditLogsDto,
} from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============ DASHBOARD ============

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  // ============ USER MANAGEMENT ============

  @Get('users')
  @ApiOperation({ summary: 'Get all users with filters' })
  async getUsers(@Query() dto: GetUsersDto) {
    return this.adminService.getUsers(dto);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get detailed user information' })
  async getUserDetails(@Param('userId') userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  @Patch('users/:userId/status')
  @ApiOperation({ summary: 'Update user status (suspend/ban/activate)' })
  async updateUserStatus(
    @CurrentUser('id') adminId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(adminId, userId, dto);
  }

  @Patch('users/:userId/role')
  @ApiOperation({ summary: 'Update user role' })
  async updateUserRole(
    @CurrentUser('id') adminId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(adminId, userId, dto);
  }

  // ============ AUDIT LOGS ============

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs with filters' })
  async getAuditLogs(@Query() dto: GetAuditLogsDto) {
    return this.adminService.getAuditLogs(dto);
  }
}
