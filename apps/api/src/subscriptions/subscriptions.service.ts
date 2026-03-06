import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from './stripe.service';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

// Feature limits by tier
const TIER_FEATURES = {
  FREE: {
    // Connection usage limits
    dailyLikes: 10,
    superLikes: 1,
    canSeeWhoLikedYou: false,
    canRewind: false,
    unlimitedLikes: false,
    readReceipts: false,
    priorityMatching: false,
    videoChat: false,
    incognitoMode: false,
    introMessages: 0,
    globalPassport: false,
    // BIA features
    biaAccess: false,
    privateForums: false,
    verifiedFilter: false,
    theBunker: false,
    businessDirectory: false,
    mentorshipTools: false,
  },
  // BIA tiers (veterans only)
  BIA_BASIC: {
    dailyLikes: 10,
    superLikes: 1,
    canSeeWhoLikedYou: false,
    canRewind: false,
    unlimitedLikes: false,
    readReceipts: false,
    priorityMatching: false,
    videoChat: false,
    incognitoMode: false,
    introMessages: 0,
    globalPassport: false,
    biaAccess: true,
    privateForums: true,
    verifiedFilter: true,
    theBunker: false,
    businessDirectory: false,
    mentorshipTools: false,
  },
  BIA_PLUS: {
    dailyLikes: 10,
    superLikes: 1,
    canSeeWhoLikedYou: false,
    canRewind: false,
    unlimitedLikes: false,
    readReceipts: false,
    priorityMatching: false,
    videoChat: false,
    incognitoMode: false,
    introMessages: 0,
    globalPassport: false,
    biaAccess: true,
    privateForums: true,
    verifiedFilter: true,
    theBunker: true,
    businessDirectory: true,
    mentorshipTools: true,
  },
  // Bundle tiers
  BUNDLE_PREMIUM_BIA: {
    dailyLikes: -1,
    superLikes: 5,
    canSeeWhoLikedYou: true,
    canRewind: true,
    unlimitedLikes: true,
    readReceipts: true,
    priorityMatching: false,
    videoChat: true,
    incognitoMode: false,
    introMessages: 0,
    globalPassport: false,
    biaAccess: true,
    privateForums: true,
    verifiedFilter: true,
    theBunker: false,
    businessDirectory: false,
    mentorshipTools: false,
  },
  BUNDLE_ULTIMATE: {
    dailyLikes: -1,
    superLikes: 10,
    canSeeWhoLikedYou: true,
    canRewind: true,
    unlimitedLikes: true,
    readReceipts: true,
    priorityMatching: true,
    videoChat: true,
    incognitoMode: true,
    introMessages: 1,
    globalPassport: false,
    biaAccess: true,
    privateForums: true,
    verifiedFilter: true,
    theBunker: true,
    businessDirectory: true,
    mentorshipTools: true,
  },
  // Legacy tiers
  PREMIUM_MONTHLY: {
    dailyLikes: -1,
    superLikes: 5,
    canSeeWhoLikedYou: true,
    canRewind: true,
    unlimitedLikes: true,
    readReceipts: true,
    priorityMatching: true,
    videoChat: true,
    incognitoMode: false,
    introMessages: 0,
    globalPassport: false,
    biaAccess: false,
    privateForums: false,
    verifiedFilter: false,
    theBunker: false,
    businessDirectory: false,
    mentorshipTools: false,
  },
  PREMIUM_ANNUAL: {
    dailyLikes: -1,
    superLikes: 5,
    canSeeWhoLikedYou: true,
    canRewind: true,
    unlimitedLikes: true,
    readReceipts: true,
    priorityMatching: true,
    videoChat: true,
    incognitoMode: false,
    introMessages: 0,
    globalPassport: false,
    biaAccess: false,
    privateForums: false,
    verifiedFilter: false,
    theBunker: false,
    businessDirectory: false,
    mentorshipTools: false,
  },
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  private getTierLimits(tier: SubscriptionTier) {
    const map = TIER_FEATURES as Record<string, (typeof TIER_FEATURES)['FREE']>;
    return map[tier] || TIER_FEATURES.PREMIUM_MONTHLY || TIER_FEATURES.FREE;
  }

  /**
   * Get or create subscription for user
   */
  async getOrCreateSubscription(userId: string) {
    let subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: {
          userId,
          tier: 'FREE',
          status: 'ACTIVE',
          dailyLikesRemaining: TIER_FEATURES.FREE.dailyLikes,
          dailyLikesResetAt: new Date(),
          superLikesRemaining: TIER_FEATURES.FREE.superLikes,
          superLikesResetAt: new Date(),
        },
      });
    }

    return this.formatSubscriptionResponse(subscription);
  }

  /**
   * Create checkout session for upgrade
   */
  async createCheckoutSession(userId: string, email: string, priceId: string) {
    if (!this.stripeService.isConfigured()) {
      throw new BadRequestException('Payments are not configured');
    }

    // Validate price ID
    const validPrices = [
      this.stripeService.PRICES.BIA_BASIC_MONTHLY,
      this.stripeService.PRICES.BIA_BASIC_ANNUAL,
      this.stripeService.PRICES.BIA_PLUS_MONTHLY,
      this.stripeService.PRICES.BIA_PLUS_ANNUAL,
      this.stripeService.PRICES.BUNDLE_PREMIUM_BIA_MONTHLY,
      this.stripeService.PRICES.BUNDLE_PREMIUM_BIA_ANNUAL,
      this.stripeService.PRICES.BUNDLE_ULTIMATE_MONTHLY,
      this.stripeService.PRICES.BUNDLE_ULTIMATE_ANNUAL,
      this.stripeService.PRICES.PREMIUM_MONTHLY,
      this.stripeService.PRICES.PREMIUM_ANNUAL,
      // Local/dev aliases
      'price_bia_basic',
      'price_bia_plus',
      'price_bia_basic_monthly',
      'price_bia_basic_annual',
      'price_bia_plus_monthly',
      'price_bia_plus_annual',
    ];

    if (!validPrices.filter(Boolean).includes(priceId)) {
      throw new BadRequestException('Invalid price ID');
    }

    // Get or create Stripe customer
    const customer = await this.stripeService.createOrGetCustomer(userId, email);

    // Update subscription with customer ID
    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customer.id,
        tier: 'FREE',
        status: 'ACTIVE',
      },
      update: {
        stripeCustomerId: customer.id,
      },
    });

    // Create checkout session
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const session = await this.stripeService.createCheckoutSession(
      customer.id,
      priceId,
      `${frontendUrl}/app/settings?subscription=success`,
      `${frontendUrl}/app/settings?subscription=cancelled`,
    );

    return { url: session.url };
  }

  /**
   * Create portal session for managing subscription
   */
  async createPortalSession(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('No active subscription found');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const session = await this.stripeService.createPortalSession(
      subscription.stripeCustomerId,
      `${frontendUrl}/app/settings`,
    );

    return { url: session.url };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription to cancel');
    }

    await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);

    await this.prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });

    return { message: 'Subscription will be cancelled at the end of the billing period' };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event) {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle checkout completion
   */
  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    if (!session.customer || !session.subscription) return;

    const customerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer.id;

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (subscription) {
      const stripeSubscription = await this.stripeService.getSubscription(
        session.subscription as string
      );

      const tier = this.determineTier(stripeSubscription.items.data[0]?.price.id);

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          stripeSubscriptionId: session.subscription as string,
          stripePriceId: stripeSubscription.items.data[0]?.price.id,
          tier,
          status: 'ACTIVE',
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: false,
          // Reset daily limits for premium
          dailyLikesRemaining: this.getTierLimits(tier).dailyLikes,
          superLikesRemaining: this.getTierLimits(tier).superLikes,
        },
      });

      // Update user role if needed
      await this.prisma.user.update({
        where: { id: subscription.userId },
        data: { role: 'VETERAN_PAID' },
      });
    }
  }

  /**
   * Handle subscription updates
   */
  private async handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription) {
    const customerId = typeof stripeSubscription.customer === 'string'
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (subscription) {
      const tier = this.determineTier(stripeSubscription.items.data[0]?.price.id);
      const status = this.mapStripeStatus(stripeSubscription.status);

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: stripeSubscription.items.data[0]?.price.id,
          tier,
          status,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        },
      });
    }
  }

  /**
   * Handle subscription deletion
   */
  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    const customerId = typeof stripeSubscription.customer === 'string'
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          tier: 'FREE',
          status: 'EXPIRED',
          stripeSubscriptionId: null,
          stripePriceId: null,
          cancelAtPeriodEnd: false,
          dailyLikesRemaining: TIER_FEATURES.FREE.dailyLikes,
          superLikesRemaining: TIER_FEATURES.FREE.superLikes,
        },
      });
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) return;

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'PAST_DUE' },
      });
    }
  }

  /**
   * Determine tier from price ID
   */
  private determineTier(priceId?: string): SubscriptionTier {
    if (!priceId) return 'FREE';

    if (
      priceId === this.stripeService.PRICES.BIA_BASIC_MONTHLY ||
      priceId === this.stripeService.PRICES.BIA_BASIC_ANNUAL ||
      priceId === 'price_bia_basic' ||
      priceId === 'price_bia_basic_monthly' ||
      priceId === 'price_bia_basic_annual'
    ) {
      return 'BIA_BASIC';
    }
    if (
      priceId === this.stripeService.PRICES.BIA_PLUS_MONTHLY ||
      priceId === this.stripeService.PRICES.BIA_PLUS_ANNUAL ||
      priceId === 'price_bia_plus' ||
      priceId === 'price_bia_plus_monthly' ||
      priceId === 'price_bia_plus_annual'
    ) {
      return 'BIA_PLUS';
    }
    if (
      priceId === this.stripeService.PRICES.BUNDLE_PREMIUM_BIA_MONTHLY ||
      priceId === this.stripeService.PRICES.BUNDLE_PREMIUM_BIA_ANNUAL
    ) {
      return 'BUNDLE_PREMIUM_BIA';
    }
    if (
      priceId === this.stripeService.PRICES.BUNDLE_ULTIMATE_MONTHLY ||
      priceId === this.stripeService.PRICES.BUNDLE_ULTIMATE_ANNUAL
    ) {
      return 'BUNDLE_ULTIMATE';
    }
    if (priceId === this.stripeService.PRICES.PREMIUM_MONTHLY) {
      return 'PREMIUM_MONTHLY';
    }
    if (priceId === this.stripeService.PRICES.PREMIUM_ANNUAL) {
      return 'PREMIUM_ANNUAL';
    }
    
    return 'FREE';
  }

  /**
   * Map Stripe subscription status to our status
   */
  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
      case 'trialing':
        return 'ACTIVE';
      case 'past_due':
        return 'PAST_DUE';
      case 'canceled':
      case 'unpaid':
        return 'CANCELLED';
      default:
        return 'EXPIRED';
    }
  }

  /**
   * Check if user can perform action based on subscription
   */
  async checkFeatureAccess(userId: string, feature: keyof typeof TIER_FEATURES.FREE): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) return TIER_FEATURES.FREE[feature] as boolean;

    const limits = this.getTierLimits(subscription.tier);
    return limits[feature] as boolean;
  }

  /**
   * Consume one daily quota unit
   */
  async useDailyLike(userId: string): Promise<{ success: boolean; remaining: number }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Check if reset needed (new day)
    const now = new Date();
    const resetAt = subscription.dailyLikesResetAt || new Date(0);
    const needsReset = now.getDate() !== resetAt.getDate() || 
                       now.getMonth() !== resetAt.getMonth() ||
                       now.getFullYear() !== resetAt.getFullYear();

    let remaining = subscription.dailyLikesRemaining;

    if (needsReset) {
      remaining = this.getTierLimits(subscription.tier).dailyLikes;
    }

    // Unlimited likes for premium
    if (remaining === -1) {
      return { success: true, remaining: -1 };
    }

    if (remaining <= 0) {
      return { success: false, remaining: 0 };
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        dailyLikesRemaining: remaining - 1,
        dailyLikesResetAt: needsReset ? now : subscription.dailyLikesResetAt,
      },
    });

    return { success: true, remaining: remaining - 1 };
  }

  /**
   * Consume one priority quota unit
   */
  async useSuperLike(userId: string): Promise<{ success: boolean; remaining: number }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Check weekly reset
    const now = new Date();
    const resetAt = subscription.superLikesResetAt || new Date(0);
    const daysSinceReset = Math.floor((now.getTime() - resetAt.getTime()) / (1000 * 60 * 60 * 24));
    const needsReset = daysSinceReset >= 7;

    let remaining = subscription.superLikesRemaining;

    if (needsReset) {
      remaining = this.getTierLimits(subscription.tier).superLikes;
    }

    if (remaining <= 0) {
      return { success: false, remaining: 0 };
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        superLikesRemaining: remaining - 1,
        superLikesResetAt: needsReset ? now : subscription.superLikesResetAt,
      },
    });

    return { success: true, remaining: remaining - 1 };
  }

  /**
   * Format subscription for API response
   */
  private formatSubscriptionResponse(subscription: any) {
    const limits = this.getTierLimits(subscription.tier as SubscriptionTier);
    
    return {
      id: subscription.id,
      tier: subscription.tier,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      dailyLikesRemaining: subscription.dailyLikesRemaining,
      superLikesRemaining: subscription.superLikesRemaining,
      features: limits,
    };
  }
}
