import { UserRole } from '../common/enums/user-role.enum';
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from './stripe.service';
import { MembershipTier, MembershipStatus } from '../common/enums/membership.enum';
import Stripe from 'stripe';
import { randomBytes } from 'crypto';

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

const REFERRAL_REWARDS: Record<number, { tier: MembershipTier; durationDays: number; label: string }> = {
  3: {
    tier: MembershipTier.BIA_BASIC,
    durationDays: 30,
    label: 'Referral reward: 3 verified referrals',
  },
};

const TIER_PRIORITY: Record<MembershipTier, number> = {
  FREE: 0,
  BIA_BASIC: 1,
  BIA_PLUS: 2,
};

const VERIFIED_REFERRER_ROLES = new Set([
  UserRole.VETERAN_VERIFIED,
  UserRole.VETERAN_MEMBER,
  UserRole.ADMIN,
  UserRole.MODERATOR,
]);

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

  private rankTier(tier: MembershipTier) {
    return TIER_PRIORITY[tier] ?? 0;
  }

  private getPreferredTier(a: MembershipTier, b: MembershipTier) {
    return this.rankTier(a) >= this.rankTier(b) ? a : b;
  }

  private normalizeMembershipTier(membership: any, now: Date) {
    if (!membership) return MembershipTier.FREE;
    if (membership.tier === MembershipTier.FREE) return MembershipTier.FREE;
    if (membership.status === MembershipStatus.EXPIRED) return MembershipTier.FREE;
    if (membership.currentPeriodEnd && new Date(membership.currentPeriodEnd) <= now) return MembershipTier.FREE;
    return membership.tier as MembershipTier;
  }

  private getFrontendBaseUrl() {
    return (
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  private formatGrant(grant: any) {
    return {
      id: grant.id,
      tier: grant.tier,
      source: grant.source,
      label: grant.label,
      startsAt: grant.startsAt,
      endsAt: grant.endsAt,
      referralMilestone: grant.referralMilestone ?? null,
      adminId: grant.adminId ?? null,
    };
  }

  private async ensureMembershipRecord(userId: string) {
    let membership = await this.prisma.membership.findUnique({ where: { userId } });

    if (!membership) {
      membership = await this.prisma.membership.create({
        data: { userId, tier: MembershipTier.FREE, status: MembershipStatus.ACTIVE },
      });
    }

    return membership;
  }

  private async getActiveGrants(userId: string, now = new Date()) {
    return (this.prisma as any).membershipGrant.findMany({
      where: {
        userId,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: [
        { endsAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  private pickActiveGrant(activeGrants: any[], effectiveTier: MembershipTier) {
    return activeGrants
      .filter((grant) => grant.tier === effectiveTier)
      .sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime())[0] ?? null;
  }

  private async syncUserRoleForMembership(userId: string, effectiveTier: MembershipTier) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return;
    if (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) return;

    if (effectiveTier !== MembershipTier.FREE && user.role === UserRole.VETERAN_VERIFIED) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.VETERAN_MEMBER as any },
      });
      return;
    }

    if (effectiveTier === MembershipTier.FREE && user.role === UserRole.VETERAN_MEMBER) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.VETERAN_VERIFIED as any },
      });
    }
  }

  private async resolveMembershipState(userId: string) {
    const now = new Date();
    const membership = await this.ensureMembershipRecord(userId);
    const activeGrants = await this.getActiveGrants(userId, now);
    const baseTier = this.normalizeMembershipTier(membership, now);

    const effectiveTier = (activeGrants as any[]).reduce(
      (current: MembershipTier, grant: any) =>
        this.getPreferredTier(current, grant.tier as MembershipTier),
      baseTier,
    );

    const activeGrant = this.pickActiveGrant(activeGrants, effectiveTier);

    await this.syncUserRoleForMembership(userId, effectiveTier);

    return {
      membership,
      baseTier,
      effectiveTier,
      activeGrant,
      activeGrants,
    };
  }

  async getOrCreateMembership(userId: string) {
    const state = await this.resolveMembershipState(userId);
    return this.formatMembershipResponse(state.membership, state.baseTier, state.effectiveTier, state.activeGrant, state.activeGrants);
  }

  async getMembershipSummary(userId: string) {
    return this.getOrCreateMembership(userId);
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
      create: { userId, stripeCustomerId: customer.id, tier: MembershipTier.FREE, status: MembershipStatus.ACTIVE },
      update: { stripeCustomerId: customer.id },
    });

    const frontendUrl = this.getFrontendBaseUrl();
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

    const frontendUrl = this.getFrontendBaseUrl();
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
          status: MembershipStatus.ACTIVE,
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          cancelAtPeriodEnd: false,
        },
      });

      await this.syncUserRoleForMembership(membership.userId, tier);
    }
  }

  private async handleSubscriptionUpdate(stripeSub: Stripe.Subscription) {
    const customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
    const membership = await this.prisma.membership.findFirst({ where: { stripeCustomerId: customerId } });

    if (membership) {
      const tier = this.determineTier(stripeSub.items.data[0]?.price.id);
      const status = this.mapStripeStatus(stripeSub.status);

      await this.prisma.membership.update({
        where: { id: membership.id },
        data: {
          stripeSubscriptionId: stripeSub.id,
          stripePriceId: stripeSub.items.data[0]?.price.id,
          tier,
          status: status as any,
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        },
      });

      await this.syncUserRoleForMembership(membership.userId, tier);
    }
  }

  private async handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    const customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
    const membership = await this.prisma.membership.findFirst({ where: { stripeCustomerId: customerId } });

    if (membership) {
      await this.prisma.membership.update({
        where: { id: membership.id },
        data: {
          tier: MembershipTier.FREE,
          status: MembershipStatus.EXPIRED,
          stripeSubscriptionId: null,
          stripePriceId: null,
          cancelAtPeriodEnd: false,
        },
      });

      await this.syncUserRoleForMembership(membership.userId, MembershipTier.FREE);
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const membership = await this.prisma.membership.findFirst({ where: { stripeCustomerId: customerId } });
    if (membership) {
      await this.prisma.membership.update({
        where: { id: membership.id },
        data: { status: MembershipStatus.PAST_DUE },
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
    const state = await this.resolveMembershipState(userId);
    const features = this.getTierFeatures(state.effectiveTier);
    return features[feature];
  }

  async ensureUserReferralCode(userId: string, prismaClient: any = this.prisma) {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { id: true, referralCode: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.referralCode) return user.referralCode;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = `VF${randomBytes(4).toString('hex').toUpperCase()}`;

      try {
        await prismaClient.user.update({
          where: { id: userId },
          data: { referralCode: candidate },
        });
        return candidate;
      } catch (error: any) {
        if (error?.code !== 'P2002') throw error;
      }
    }

    throw new BadRequestException('Unable to generate a referral code right now');
  }

  async registerReferralSignup(referredUserId: string, referralCode: string, prismaClient: any = this.prisma) {
    const normalizedCode = referralCode.trim().toUpperCase();
    if (!normalizedCode) return null;

    const inviter = await prismaClient.user.findFirst({
      where: { referralCode: normalizedCode },
      select: {
        id: true,
        role: true,
        emailVerified: true,
        status: true,
      },
    });

    if (!inviter || !VERIFIED_REFERRER_ROLES.has(inviter.role as UserRole) || !inviter.emailVerified || inviter.status !== 'ACTIVE') {
      throw new BadRequestException('Referral code is invalid or not eligible for verified-veteran invites.');
    }

    if (inviter.id === referredUserId) {
      throw new BadRequestException('You cannot use your own referral code.');
    }

    const existing = await prismaClient.referral.findUnique({
      where: { referredUserId },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('A referral has already been applied to this signup.');
    }

    return prismaClient.referral.create({
      data: {
        inviterId: inviter.id,
        referredUserId,
        referralCode: normalizedCode,
      },
    });
  }

  async grantTimedMembership(
    userId: string,
    tier: MembershipTier,
    durationDays: number,
    source: 'REFERRAL' | 'ADMIN',
    options?: { adminId?: string; referralMilestone?: number; label?: string },
  ) {
    if (tier === MembershipTier.FREE) {
      throw new BadRequestException('Timed access grants must be BIA or BIA+.');
    }

    await this.ensureMembershipRecord(userId);

    const now = new Date();
    const latestGrant = await (this.prisma as any).membershipGrant.findFirst({
      where: {
        userId,
        endsAt: { gt: now },
      },
      orderBy: { endsAt: 'desc' },
      select: { endsAt: true },
    });

    const baseTime = latestGrant?.endsAt ? new Date(latestGrant.endsAt).getTime() : now.getTime();
    const endAt = new Date(Math.max(baseTime, now.getTime()) + (durationDays * 24 * 60 * 60 * 1000));

    const grant = await (this.prisma as any).membershipGrant.create({
      data: {
        userId,
        tier,
        source,
        adminId: options?.adminId || null,
        referralMilestone: options?.referralMilestone || null,
        label: options?.label || null,
        startsAt: now,
        endsAt: endAt,
      },
    });

    await this.syncUserRoleForMembership(userId, tier);

    return {
      grant: this.formatGrant(grant),
      membership: await this.getOrCreateMembership(userId),
    };
  }

  async grantAdminMembership(userId: string, tier: MembershipTier, durationDays: number, adminId: string) {
    return this.grantTimedMembership(userId, tier, durationDays, 'ADMIN', {
      adminId,
      label: `Admin grant: ${tier}`,
    });
  }

  async processReferralQualification(referredUserId: string) {
    const referral = await (this.prisma as any).referral.findUnique({
      where: { referredUserId },
      include: {
        inviter: {
          select: {
            id: true,
            role: true,
            emailVerified: true,
            status: true,
          },
        },
      },
    });

    if (!referral || referral.qualifiedAt) {
      return null;
    }

    if (!VERIFIED_REFERRER_ROLES.has(referral.inviter.role as UserRole) || !referral.inviter.emailVerified || referral.inviter.status !== 'ACTIVE') {
      return null;
    }

    await (this.prisma as any).referral.update({
      where: { id: referral.id },
      data: { qualifiedAt: new Date() },
    });

    const qualifiedCount = await (this.prisma as any).referral.count({
      where: {
        inviterId: referral.inviterId,
        qualifiedAt: { not: null },
      },
    });

    const existingMilestoneRows = await (this.prisma as any).membershipGrant.findMany({
      where: {
        userId: referral.inviterId,
        source: 'REFERRAL',
        referralMilestone: { not: null },
      },
      select: { referralMilestone: true },
    });

    const grantedMilestones = new Set<number>(
      existingMilestoneRows
        .map((row: any) => Number(row.referralMilestone))
        .filter((value: number) => Number.isFinite(value)),
    );

    const rewards: Array<{ milestone: number; tier: MembershipTier; durationDays: number }> = [];

    for (const milestone of [3]) {
      if (qualifiedCount < milestone || grantedMilestones.has(milestone)) continue;

      const reward = REFERRAL_REWARDS[milestone];
      await this.grantTimedMembership(referral.inviterId, reward.tier, reward.durationDays, 'REFERRAL', {
        referralMilestone: milestone,
        label: reward.label,
      });
      rewards.push({
        milestone,
        tier: reward.tier,
        durationDays: reward.durationDays,
      });
    }

    return {
      inviterId: referral.inviterId,
      qualifiedCount,
      rewards,
    };
  }

  async getReferralSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        emailVerified: true,
        status: true,
        referralCode: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const referralCode = user.referralCode || await this.ensureUserReferralCode(userId);

    const referrals = await (this.prisma as any).referral.findMany({
      where: { inviterId: userId },
      include: {
        referredUser: {
          select: {
            id: true,
            email: true,
            emailVerified: true,
            profile: { select: { displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rewardGrants = await (this.prisma as any).membershipGrant.findMany({
      where: {
        userId,
        source: 'REFERRAL',
      },
      orderBy: { createdAt: 'asc' },
    });

    const qualifiedCount = referrals.filter((referral: any) => !!referral.qualifiedAt).length;
    const nextMilestone = [3].find((milestone) => milestone > qualifiedCount) ?? null;
    const canInvite =
      VERIFIED_REFERRER_ROLES.has(user.role as UserRole) &&
      user.emailVerified &&
      user.status === 'ACTIVE';

    return {
      canInvite,
      referralCode,
      shareUrl: `${this.getFrontendBaseUrl()}/auth/register?ref=${encodeURIComponent(referralCode)}`,
      qualifiedCount,
      pendingCount: referrals.filter((referral: any) => !referral.qualifiedAt).length,
      nextMilestone,
      milestones: [3].map((milestone) => ({
        milestone,
        unlocked: qualifiedCount >= milestone,
        reward: REFERRAL_REWARDS[milestone],
      })),
      referrals: referrals.map((referral: any) => ({
        id: referral.id,
        createdAt: referral.createdAt,
        qualifiedAt: referral.qualifiedAt,
        user: {
          id: referral.referredUser.id,
          email: referral.referredUser.email,
          emailVerified: referral.referredUser.emailVerified,
          displayName: referral.referredUser.profile?.displayName || null,
        },
      })),
      rewards: rewardGrants.map((grant: any) => this.formatGrant(grant)),
    };
  }

  private formatMembershipResponse(
    membership: any,
    baseTier: MembershipTier,
    effectiveTier: MembershipTier,
    activeGrant: any,
    activeGrants: any[],
  ) {
    const features = this.getTierFeatures(effectiveTier);

    return {
      id: membership.id,
      tier: effectiveTier,
      baseTier,
      status: activeGrant ? MembershipStatus.ACTIVE : membership.status,
      currentPeriodStart: activeGrant ? activeGrant.startsAt : membership.currentPeriodStart,
      currentPeriodEnd: activeGrant ? activeGrant.endsAt : membership.currentPeriodEnd,
      cancelAtPeriodEnd: membership.cancelAtPeriodEnd,
      features,
      activeGrant: activeGrant ? this.formatGrant(activeGrant) : null,
      activeGrants: activeGrants.map((grant) => this.formatGrant(grant)),
    };
  }
}
