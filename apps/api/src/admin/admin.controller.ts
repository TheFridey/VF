import {
  Controller,
  Get,
  Patch,
  Delete,
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
  BulkUpdateUserStatusDto,
  UpdateUserRoleDto,
  GetAuditLogsDto,
  UpdateThreadDto,
  UpdateListingDto,
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

  @Patch('users/bulk-status')
  @ApiOperation({ summary: 'Bulk update user statuses' })
  async bulkUpdateUserStatus(
    @CurrentUser('id') adminId: string,
    @Body() dto: BulkUpdateUserStatusDto,
  ) {
    return this.adminService.bulkUpdateUserStatus(adminId, dto);
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

  // ============ BIA COMMUNITY ============

  @Get('bia/threads')
  @ApiOperation({ summary: 'Get all forum threads for moderation' })
  async getForumThreads(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.adminService.getForumThreads({ page: +page, limit: +limit, categoryId });
  }

  @Patch('bia/threads/:threadId')
  @ApiOperation({ summary: 'Lock/unlock forum thread' })
  async updateThread(
    @Param('threadId') threadId: string,
    @Body() body: UpdateThreadDto,
  ) {
    return this.adminService.updateForumThread(threadId, body);
  }

  @Delete('bia/threads/:threadId')
  @ApiOperation({ summary: 'Delete forum thread' })
  async deleteThread(@Param('threadId') threadId: string, @CurrentUser('id') adminId: string) {
    return this.adminService.deleteForumThread(threadId, adminId);
  }

  @Get('bia/listings')
  @ApiOperation({ summary: 'Get all business listings' })
  async getListings(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getBusinessListings({ page: +page, limit: +limit });
  }

  @Patch('bia/listings/:listingId')
  @ApiOperation({ summary: 'Approve/reject business listing' })
  async updateListing(
    @Param('listingId') listingId: string,
    @Body() body: UpdateListingDto,
  ) {
    return this.adminService.updateBusinessListing(listingId, body.isApproved);
  }
}
