import { UserRole } from '../common/enums/user-role.enum';
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from './stripe.service';
import { MembershipTier, MembershipStatus } from '../common/enums/membership.enum';
import Stripe from 'stripe';

// Feature access by membership tier
const TIER_FEATURES = {
  FREE: {
    biaAccess:          false,
    privateForums:      false,
    verifiedFilter:     false,
    theBunker:          false,
    businessDirectory:  false,
    mentorshipTools:    false,
    careerResources:    false,
    videoChat:          false,
    prioritySupport:    false,
  },
  BIA_BASIC: {
    biaAccess:          true,
    privateForums:      true,
    verifiedFilter:     true,
    theBunker:          false,
    businessDirectory:  false,
    mentorshipTools:    false,
    careerResources:    false,
    videoChat:          true,
    prioritySupport:    false,
  },
  BIA_PLUS: {
    biaAccess:          true,
    privateForums:      true,
    verifiedFilter:     true,
    theBunker:          true,
    businessDirectory:  true,
    mentorshipTools:    true,
    careerResources:    true,
    videoChat:          true,
    prioritySupport:    true,
  },
};

const DEV_PRICE_ALIASES = {
  price_bia_basic_monthly: 'BIA_BASIC_MONTHLY',
  price_bia_basic_annual: 'BIA_BASIC_ANNUAL',
  price_bia_plus_monthly: 'BIA_PLUS_MONTHLY',
  price_bia_plus_annual: 'BIA_PLUS_ANNUAL',
} as const;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  private getTierFeatures(tier: MembershipTier) {
    return TIER_FEATURES[tier] ?? TIER_FEATURES.FREE;
  }

  private getConfiguredPrices() {
    return this.stripeService.PRICES;
  }

  private resolvePriceId(priceId: string): string {
    const aliasKey = DEV_PRICE_ALIASES[priceId as keyof typeof DEV_PRICE_ALIASES];
    if (!aliasKey) {
      return priceId;
    }

    return this.getConfiguredPrices()[aliasKey] || priceId;
  }

  async getOrCreateMembership(userId: string) {
    let membership = await this.prisma.membership.findUnique({ where: { userId } });

    if (!membership) {
      membership = await this.prisma.membership.create({
        data: { userId, tier: 'FREE', status: 'ACTIVE' },
      });
    }

    return this.formatMembershipResponse(membership);
  }

  async createCheckoutSession(userId: string, email: string, priceId: string) {
    if (!this.stripeService.isConfigured()) {
      throw new BadRequestException('Membership payments are not configured');
    }

    const resolvedPriceId = this.resolvePriceId(priceId);
    const validPrices = Object.values(this.getConfiguredPrices()).filter(Boolean);

    if (!validPrices.includes(resolvedPriceId)) {
      throw new BadRequestException('Invalid price ID');
    }

    const customer = await this.stripeService.createOrGetCustomer(userId, email);

    await this.prisma.membership.upsert({
      where: { userId },
      create: { userId, stripeCustomerId: customer.id, tier: 'FREE', status: 'ACTIVE' },
      update: { stripeCustomerId: customer.id },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const session = await this.stripeService.createCheckoutSession(
      customer.id,
      resolvedPriceId,
      `${frontendUrl}/app/settings?membership=success`,
      `${frontendUrl}/app/settings?membership=cancelled`,
    );

    return { url: session.url };
  }

  async createPortalSession(userId: string) {
    const membership = await this.prisma.membership.findUnique({ where: { userId } });

    if (!membership?.stripeCustomerId) {
      throw new BadRequestException('No active membership found');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const session = await this.stripeService.createPortalSession(
      membership.stripeCustomerId,
      `${frontendUrl}/app/settings`,
    );

    return { url: session.url };
  }

  async cancelMembership(userId: string) {
    const membership = await this.prisma.membership.findUnique({ where: { userId } });

    if (!membership?.stripeSubscriptionId) {
      throw new BadRequestException('No active membership to cancel');
    }

    await this.stripeService.cancelSubscription(membership.stripeSubscriptionId);
    await this.prisma.membership.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });

    return { message: 'Membership will be cancelled at the end of the current billing period' };
  }

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

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    if (!session.customer || !session.subscription) return;

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
    const membership = await this.prisma.membership.findFirst({ where: { stripeCustomerId: customerId } });

    if (membership) {
      const stripeSub = await this.stripeService.getSubscription(session.subscription as string);
      const tier = this.determineTier(stripeSub.items.data[0]?.price.id);

      await this.prisma.membership.update({
        where: { id: membership.id },
        data: {
          stripeSubscriptionId: session.subscription as string,
          stripePriceId: stripeSub.items.data[0]?.price.id,
          tier,
          status: 'ACTIVE',
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
          cancelAtPeriodEnd: false,
        },
      });

      await this.prisma.user.update({
        where: { id: membership.userId },
        data: { role: UserRole.VETERAN_MEMBER as any },
      });
    }
  }

  private async handleSubscriptionUpdate(stripeSub: Stripe.Subscription) {
    const customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
    const membership = await this.prisma.membership.findFirst({ where: { stripeCustomerId: customerId } });

    if (membership) {
      const tier   = this.determineTier(stripeSub.items.data[0]?.price.id);
      const status = this.mapStripeStatus(stripeSub.status);

      await this.prisma.membership.update({
        where: { id: membership.id },
        data: {
          stripeSubscriptionId: stripeSub.id,
          stripePriceId: stripeSub.items.data[0]?.price.id,
          tier,
          status: status as any,
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
          cancelAtPeriodEnd:  stripeSub.cancel_at_period_end,
        },
      });
    }
  }

  private async handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    const customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
    const membership = await this.prisma.membership.findFirst({ where: { stripeCustomerId: customerId } });

    if (membership) {
      await this.prisma.membership.update({
        where: { id: membership.id },
        data: {
          tier: 'FREE',
          status: 'EXPIRED',
          stripeSubscriptionId: null,
          stripePriceId: null,
          cancelAtPeriodEnd: false,
        },
      });

      // Downgrade role back to verified
      await this.prisma.user.update({
        where: { id: membership.userId },
        data: { role: 'VETERAN_VERIFIED' },
      });
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const membership = await this.prisma.membership.findFirst({ where: { stripeCustomerId: customerId } });
    if (membership) {
      await this.prisma.membership.update({
        where: { id: membership.id },
        data: { status: 'PAST_DUE' },
      });
    }
  }

  private determineTier(priceId?: string): MembershipTier {
    if (!priceId) return MembershipTier.FREE;

    const resolvedPriceId = this.resolvePriceId(priceId);

    if (
      resolvedPriceId === this.stripeService.PRICES.BIA_BASIC_MONTHLY ||
      resolvedPriceId === this.stripeService.PRICES.BIA_BASIC_ANNUAL
    ) return MembershipTier.BIA_BASIC;

    if (
      resolvedPriceId === this.stripeService.PRICES.BIA_PLUS_MONTHLY ||
      resolvedPriceId === this.stripeService.PRICES.BIA_PLUS_ANNUAL
    ) return MembershipTier.BIA_PLUS;

    return MembershipTier.FREE;
  }

  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): MembershipStatus {
    switch (stripeStatus) {
      case 'active':
      case 'trialing':
        return MembershipStatus.ACTIVE;
      case 'past_due':
        return MembershipStatus.PAST_DUE;
      case 'canceled':
      case 'unpaid':
        return MembershipStatus.CANCELLED;
      default:
        return MembershipStatus.EXPIRED;
    }
  }

  async checkFeatureAccess(userId: string, feature: keyof typeof TIER_FEATURES.FREE): Promise<boolean> {
    const membership = await this.prisma.membership.findUnique({ where: { userId } });
    if (!membership) return TIER_FEATURES.FREE[feature];

    const features = this.getTierFeatures(membership.tier as MembershipTier);
    return features[feature];
  }

  private formatMembershipResponse(membership: any) {
    const features = this.getTierFeatures(membership.tier as MembershipTier);

    return {
      id:                  membership.id,
      tier:                membership.tier,
      status:              membership.status,
      currentPeriodStart:  membership.currentPeriodStart,
      currentPeriodEnd:    membership.currentPeriodEnd,
      cancelAtPeriodEnd:   membership.cancelAtPeriodEnd,
      features,
    };
  }
}
