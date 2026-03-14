import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SendMessageDto, UpdateMessageDto } from './dto/messaging.dto';
import { Request } from 'express';

@ApiTags('messaging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations' })
  async getConversations(@CurrentUser('id') userId: string) {
    return this.messagingService.getConversations(userId);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread message counts' })
  async getUnreadCounts(@CurrentUser('id') userId: string) {
    return this.messagingService.getUnreadCounts(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  async sendMessagePost(
    @CurrentUser('id') userId: string,
    @Body() body: { connectionId: string; content: string },
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.messagingService.sendMessage(body.connectionId, userId, body.content, ipAddress);
  }

  @Post(':connectionId')
  @ApiOperation({ summary: 'Send a message to a connection' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('connectionId') connectionId: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.messagingService.sendMessage(connectionId, userId, dto.content, ipAddress);
  }

  @Get(':connectionId')
  @ApiOperation({ summary: 'Get messages for a connection' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('connectionId') connectionId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getMessages(
      connectionId,
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post(':connectionId/read')
  @ApiOperation({ summary: 'Mark all messages in connection as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('connectionId') connectionId: string,
  ) {
    return this.messagingService.markAsRead(connectionId, userId);
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message (within 15 minutes)' })
  async editMessage(
    @CurrentUser('id') userId: string,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.messagingService.editMessage(messageId, userId, dto.content, ipAddress);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  async deleteMessage(
    @CurrentUser('id') userId: string,
    @Param('messageId') messageId: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.messagingService.deleteMessage(messageId, userId, ipAddress);
  }
}
