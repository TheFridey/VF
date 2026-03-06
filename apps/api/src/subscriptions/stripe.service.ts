import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  
  readonly PRICES = {
    // BIA tiers
    BIA_BASIC_MONTHLY: '',
    BIA_BASIC_ANNUAL: '',
    BIA_PLUS_MONTHLY: '',
    BIA_PLUS_ANNUAL: '',
    // Bundles
    BUNDLE_PREMIUM_BIA_MONTHLY: '',
    BUNDLE_PREMIUM_BIA_ANNUAL: '',
    BUNDLE_ULTIMATE_MONTHLY: '',
    BUNDLE_ULTIMATE_ANNUAL: '',
    // Legacy
    PREMIUM_MONTHLY: '',
    PREMIUM_ANNUAL: '',
  };

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    
    if (!secretKey) {
      this.logger.warn('Stripe secret key not configured - payments will be disabled');
      this.stripe = null as any;
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
      });
      
      // Load price IDs from config
      this.PRICES.BIA_BASIC_MONTHLY = this.configService.get<string>('STRIPE_PRICE_BIA_BASIC_MONTHLY') || '';
      this.PRICES.BIA_BASIC_ANNUAL = this.configService.get<string>('STRIPE_PRICE_BIA_BASIC_ANNUAL') || '';
      this.PRICES.BIA_PLUS_MONTHLY = this.configService.get<string>('STRIPE_PRICE_BIA_PLUS_MONTHLY') || '';
      this.PRICES.BIA_PLUS_ANNUAL = this.configService.get<string>('STRIPE_PRICE_BIA_PLUS_ANNUAL') || '';
      this.PRICES.BUNDLE_PREMIUM_BIA_MONTHLY = this.configService.get<string>('STRIPE_PRICE_BUNDLE_PREMIUM_BIA_MONTHLY') || '';
      this.PRICES.BUNDLE_PREMIUM_BIA_ANNUAL = this.configService.get<string>('STRIPE_PRICE_BUNDLE_PREMIUM_BIA_ANNUAL') || '';
      this.PRICES.BUNDLE_ULTIMATE_MONTHLY = this.configService.get<string>('STRIPE_PRICE_BUNDLE_ULTIMATE_MONTHLY') || '';
      this.PRICES.BUNDLE_ULTIMATE_ANNUAL = this.configService.get<string>('STRIPE_PRICE_BUNDLE_ULTIMATE_ANNUAL') || '';
      // Legacy
      this.PRICES.PREMIUM_MONTHLY = this.configService.get<string>('STRIPE_PRICE_MONTHLY') || '';
      this.PRICES.PREMIUM_ANNUAL = this.configService.get<string>('STRIPE_PRICE_ANNUAL') || '';
    }
  }

  isConfigured(): boolean {
    return !!this.stripe;
  }

  /**
   * Create or retrieve a Stripe customer for a user
   */
  async createOrGetCustomer(userId: string, email: string): Promise<Stripe.Customer> {
    if (!this.stripe) throw new BadRequestException('Payments not configured');

    // Search for existing customer
    const existingCustomers = await this.stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    return this.stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) throw new BadRequestException('Payments not configured');

    return this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 7, // 7 day free trial
      },
    });
  }

  /**
   * Create a billing portal session
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    if (!this.stripe) throw new BadRequestException('Payments not configured');

    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    if (!this.stripe) throw new BadRequestException('Payments not configured');

    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  /**
   * Resume a cancelled subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    if (!this.stripe) throw new BadRequestException('Payments not configured');

    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    if (!this.stripe) throw new BadRequestException('Payments not configured');

    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Construct webhook event
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    if (!this.stripe) throw new BadRequestException('Payments not configured');

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Get price details
   */
  async getPrice(priceId: string): Promise<Stripe.Price> {
    if (!this.stripe) throw new BadRequestException('Payments not configured');

    return this.stripe.prices.retrieve(priceId);
  }
}
