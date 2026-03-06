import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { PushNotificationService } from './push.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class NotificationsModule {}
