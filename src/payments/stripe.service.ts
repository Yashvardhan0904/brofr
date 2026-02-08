import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured. Stripe payments will not work.');
      // Initialize with a dummy key to prevent crashes
      this.stripe = new Stripe('sk_test_dummy', {
        apiVersion: '2026-01-28.clover',
      });
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2026-01-28.clover',
      });
      this.logger.log('Stripe initialized successfully');
    }
  }

  /**
   * Create a Payment Intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount, // Amount in smallest currency unit (paise for INR)
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`Payment Intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to create Payment Intent', error);
      throw error;
    }
  }

  /**
   * Retrieve a Payment Intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error(`Failed to retrieve Payment Intent: ${paymentIntentId}`, error);
      throw error;
    }
  }

  /**
   * Confirm a Payment Intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const params: Stripe.PaymentIntentConfirmParams = {};
      if (paymentMethodId) {
        params.payment_method = paymentMethodId;
      }

      return await this.stripe.paymentIntents.confirm(paymentIntentId, params);
    } catch (error) {
      this.logger.error(`Failed to confirm Payment Intent: ${paymentIntentId}`, error);
      throw error;
    }
  }

  /**
   * Cancel a Payment Intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error) {
      this.logger.error(`Failed to cancel Payment Intent: ${paymentIntentId}`, error);
      throw error;
    }
  }

  /**
   * Create a Refund
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: Stripe.RefundCreateParams.Reason,
  ): Promise<Stripe.Refund> {
    try {
      const params: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        params.amount = amount;
      }

      if (reason) {
        params.reason = reason;
      }

      const refund = await this.stripe.refunds.create(params);
      this.logger.log(`Refund created: ${refund.id} for Payment Intent: ${paymentIntentId}`);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to create refund for Payment Intent: ${paymentIntentId}`, error);
      throw error;
    }
  }

  /**
   * Verify Webhook Signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      throw error;
    }
  }

  /**
   * Get Stripe instance (for advanced usage)
   */
  getStripeInstance(): Stripe {
    return this.stripe;
  }
}
