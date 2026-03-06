import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GdprService } from './gdpr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestDeletionDto } from './dto/gdpr.dto';

@ApiTags('gdpr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gdpr')
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export all personal data (GDPR Article 20)' })
  async exportData(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const data = await this.gdprService.exportUserData(userId);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="veteranfinder-data-export-${new Date().toISOString().split('T')[0]}.json"`,
    );
    
    return res.send(JSON.stringify(data, null, 2));
  }

  @Post('delete')
  @ApiOperation({ summary: 'Request account deletion (GDPR Article 17)' })
  async requestDeletion(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestDeletionDto,
  ) {
    return this.gdprService.requestDataDeletion(userId, dto.password);
  }

  @Delete('delete')
  @ApiOperation({ summary: 'Cancel pending deletion request' })
  async cancelDeletion(@CurrentUser('id') userId: string) {
    return this.gdprService.cancelDeletionRequest(userId);
  }

  @Get('delete/status')
  @ApiOperation({ summary: 'Get deletion request status' })
  async getDeletionStatus(@CurrentUser('id') userId: string) {
    return this.gdprService.getDeletionStatus(userId);
  }

  // Admin endpoint to manually trigger scheduled deletions
  @Post('process-deletions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Process scheduled deletions (admin only)' })
  async processScheduledDeletions() {
    return this.gdprService.processScheduledDeletions();
  }
}
