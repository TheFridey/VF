import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PushNotificationService, PushSubscription } from './push.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private pushService: PushNotificationService) {}

  @Get('vapid-key')
  @ApiOperation({ summary: 'Get VAPID public key for push notifications' })
  getVapidKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  async subscribe(
    @CurrentUser() user: User,
    @Body() subscription: PushSubscription,
  ) {
    return this.pushService.subscribe(user.id, subscription);
  }

  @Delete('unsubscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  async unsubscribe(
    @CurrentUser() user: User,
    @Body() body: { endpoint: string },
  ) {
    return this.pushService.unsubscribe(user.id, body.endpoint);
  }
}
