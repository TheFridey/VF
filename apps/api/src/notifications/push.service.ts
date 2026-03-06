import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';
import { PrismaService } from '../common/prisma/prisma.service';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private isConfigured = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const vapidEmail = this.configService.get<string>('VAPID_EMAIL', 'mailto:hello@veteranfinder.com');

    if (vapidPublicKey && vapidPrivateKey) {
      webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
      this.isConfigured = true;
      this.logger.log('Push notifications configured');
    } else {
      this.logger.warn('VAPID keys not configured - push notifications disabled');
    }
  }

  /**
   * Subscribe a user to push notifications
   */
  async subscribe(userId: string, subscription: PushSubscription) {
    // Store subscription in database (we'd need to add a PushSubscription model)
    // For now, we'll store it in user metadata or a separate collection

    // You could add a new table like:
    // await this.prisma.pushSubscription.upsert({
    //   where: { endpoint: subscription.endpoint },
    //   create: {
    //     userId,
    //     endpoint: subscription.endpoint,
    //     p256dh: subscription.keys.p256dh,
    //     auth: subscription.keys.auth,
    //   },
    //   update: {
    //     userId,
    //     p256dh: subscription.keys.p256dh,
    //     auth: subscription.keys.auth,
    //   },
    // });

    this.logger.log(`User ${userId} subscribed to push notifications`);
    return { success: true };
  }

  /**
   * Unsubscribe a user from push notifications
   */
  async unsubscribe(userId: string, endpoint: string) {
    // await this.prisma.pushSubscription.deleteMany({
    //   where: { userId, endpoint },
    // });

    this.logger.log(`User ${userId} unsubscribed from push notifications`);
    return { success: true };
  }

  /**
   * Send push notification to a user
   */
  async sendToUser(userId: string, payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
    data?: any;
  }) {
    if (!this.isConfigured) {
      this.logger.warn('Push notifications not configured');
      return;
    }

    // Get user's push subscriptions
    // const subscriptions = await this.prisma.pushSubscription.findMany({
    //   where: { userId },
    // });

    // For now, just log the notification
    this.logger.log(`Push notification to ${userId}: ${payload.title}`);

    // In production:
    // for (const sub of subscriptions) {
    //   try {
    //     await webPush.sendNotification(
    //       {
    //         endpoint: sub.endpoint,
    //         keys: {
    //           p256dh: sub.p256dh,
    //           auth: sub.auth,
    //         },
    //       },
    //       JSON.stringify(payload),
    //     );
    //   } catch (error) {
    //     if (error.statusCode === 410 || error.statusCode === 404) {
    //       // Subscription expired or invalid, remove it
    //       await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
    //     }
    //     this.logger.error(`Failed to send push: ${error.message}`);
    //   }
    // }
  }

  /**
   * Send notification for new message
   */
  async notifyNewMessage(userId: string, senderName: string, matchId: string, preview: string) {
    await this.sendToUser(userId, {
      title: `New message from ${senderName}`,
      body: preview,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      url: `/app/messages/${matchId}`,
      tag: `message-${matchId}`,
      data: { type: 'message', matchId },
    });
  }

  /**
   * Send notification for new match
   */
  async notifyNewMatch(userId: string, matchedUserName: string, matchId: string) {
    await this.sendToUser(userId, {
      title: 'New connection established',
      body: `You are now connected with ${matchedUserName}.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      url: `/app/messages/${matchId}`,
      tag: `match-${matchId}`,
      data: { type: 'match', matchId },
    });
  }

  /**
   * Get VAPID public key for client
   */
  getPublicKey(): string {
    return this.configService.get<string>('VAPID_PUBLIC_KEY') || '';
  }
}
