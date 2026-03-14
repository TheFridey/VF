import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';
import { PrismaService } from '../common/prisma/prisma.service';

export interface PushSubscriptionDto {
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
    const vapidEmail = this.configService.get<string>('VAPID_EMAIL', 'mailto:hello@veteranfinder.co.uk');

    if (vapidPublicKey && vapidPrivateKey) {
      webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
      this.isConfigured = true;
      this.logger.log('Push notifications configured');
    } else {
      this.logger.warn('VAPID keys not configured — push notifications disabled');
    }
  }

  async subscribe(userId: string, subscription: PushSubscriptionDto) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
    return { success: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { success: true };
  }

  async sendToUser(userId: string, payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
    data?: any;
  }) {
    if (!this.isConfigured) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions.length) return;

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon ?? '/icons/icon-192x192.png',
      badge: payload.badge ?? '/icons/badge-72x72.png',
      tag: payload.tag,
      data: { url: payload.url, ...payload.data },
    });

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message,
        );
      } catch (err: any) {
        // 410 Gone / 404 = subscription expired, clean it up
        if (err.statusCode === 410 || err.statusCode === 404) {
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
          this.logger.log(`Removed expired push subscription for user ${userId}`);
        } else {
          this.logger.error(`Push failed for user ${userId}: ${err.message}`);
        }
      }
    }
  }

  async notifyNewMessage(userId: string, senderName: string, connectionId: string, preview: string) {
    await this.sendToUser(userId, {
      title: `New message from ${senderName}`,
      body: preview,
      url: `/app/messages/${connectionId}`,
      tag: `message-${connectionId}`,
      data: { type: 'message', connectionId },
    });
  }

  async notifyNewConnection(userId: string, connectedUserName: string, connectionId: string) {
    await this.sendToUser(userId, {
      title: 'New connection',
      body: `You are now connected with ${connectedUserName}`,
      url: `/app/messages/${connectionId}`,
      tag: `connection-${connectionId}`,
      data: { type: 'connection', connectionId },
    });
  }

  async notifyVerificationUpdate(userId: string, approved: boolean) {
    await this.sendToUser(userId, {
      title: approved ? 'Verification approved ✓' : 'Verification update',
      body: approved
        ? 'Your veteran status is verified. Full access is now unlocked.'
        : 'Your verification needs attention. Check your settings.',
      url: approved ? '/app/brothers' : '/app/settings',
      tag: 'verification-update',
      data: { type: 'verification', approved },
    });
  }

  getPublicKey(): string {
    return this.configService.get<string>('VAPID_PUBLIC_KEY') ?? '';
  }
}
