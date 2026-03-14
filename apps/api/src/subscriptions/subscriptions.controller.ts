import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  RawBodyRequest,
  Req,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private stripeService: StripeService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  async getMySubscription(@CurrentUser() user: User) {
    return this.subscriptionsService.getOrCreateMembership(user.id);
  }

  @Get('prices')
  @ApiOperation({ summary: 'Get available subscription prices' })
  async getPrices() {
    return {
      bia: {
        basic: {
          monthly: {
            priceId: this.stripeService.PRICES.BIA_BASIC_MONTHLY || 'price_bia_basic_monthly',
            price: 6.99,
            currency: 'GBP',
          },
          annual: {
            priceId: this.stripeService.PRICES.BIA_BASIC_ANNUAL || 'price_bia_basic_annual',
            price: 55.99,
            currency: 'GBP',
          },
          features: [
            'Brothers in Arms section',
            'Private veterans forums',
            'Verified veteran profile badge',
            'Video chat with connections',
          ],
          requiresVerification: true,
        },
        plus: {
          monthly: {
            priceId: this.stripeService.PRICES.BIA_PLUS_MONTHLY || 'price_bia_plus_monthly',
            price: 14.99,
            currency: 'GBP',
          },
          annual: {
            priceId: this.stripeService.PRICES.BIA_PLUS_ANNUAL || 'price_bia_plus_annual',
            price: 119.99,
            currency: 'GBP',
          },
          features: [
            'Everything in BIA',
            'The Bunker (premium forums)',
            'Veterans business directory',
            'Mentorship tools',
            'Career resources',
          ],
          requiresVerification: true,
        },
      },
    };
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create checkout session for subscription' })
  async createCheckoutSession(
    @CurrentUser() user: User,
    @Body() body: { priceId: string },
  ) {
    if (!body.priceId) {
      throw new BadRequestException('Price ID is required');
    }

    return this.subscriptionsService.createCheckoutSession(
      user.id,
      user.email,
      body.priceId,
    );
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create billing portal session' })
  async createPortalSession(@CurrentUser() user: User) {
    return this.subscriptionsService.createPortalSession(user.id);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  async cancelSubscription(@CurrentUser() user: User) {
    return this.subscriptionsService.cancelMembership(user.id);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing request body');
    }

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    try {
      const event = this.stripeService.constructWebhookEvent(req.rawBody, signature);
      await this.subscriptionsService.handleWebhook(event);
      return { received: true };
    } catch (error) {
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }
}
