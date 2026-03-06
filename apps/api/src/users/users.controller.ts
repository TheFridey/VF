import { Controller, Get, Post, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: User) {
    return this.usersService.getMe(user.id);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Permanently delete account and all data (GDPR compliant)' })
  async deleteAccount(@CurrentUser() user: User) {
    return this.usersService.deleteAccount(user.id);
  }

  @Get('me/export')
  @ApiOperation({ summary: 'Export all user data (GDPR data portability)' })
  async exportData(@CurrentUser() user: User) {
    return this.usersService.exportUserData(user.id);
  }
}
