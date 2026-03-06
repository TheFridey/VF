import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { VerificationService } from './verification.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('verification')
@ApiBearerAuth()
@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current verification status' })
  async getStatus(@CurrentUser('id') userId: string) {
    return this.verificationService.getMyRequests(userId);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit verification request with evidence files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        notes: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 5))
  async submit(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: any[],
    @Body('notes') notes: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.verificationService.submitVerification(userId, files || [], notes, ipAddress);
  }

  // Admin endpoints
  @Get('admin/pending')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get pending verification requests' })
  async getPendingRequests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.verificationService.getPendingRequests(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('admin/requests/:requestId')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get verification request details' })
  async getRequest(@Param('requestId') requestId: string) {
    return this.verificationService.getRequest(requestId);
  }

  @Patch('admin/requests/:requestId/approve')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Approve verification request' })
  async approveRequest(
    @Param('requestId') requestId: string,
    @CurrentUser('id') adminId: string,
    @Body('adminNotes') adminNotes: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.verificationService.approveVerification(requestId, adminId, adminNotes, ipAddress);
  }

  @Patch('admin/requests/:requestId/reject')
  @UseGuards(RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiOperation({ summary: 'Reject verification request' })
  async rejectRequest(
    @Param('requestId') requestId: string,
    @CurrentUser('id') adminId: string,
    @Body('reason') reason: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.verificationService.rejectVerification(requestId, adminId, reason, ipAddress);
  }
}
