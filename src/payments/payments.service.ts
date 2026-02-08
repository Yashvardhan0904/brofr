import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { Payment, PaymentStatus, PaymentProvider, OrderStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private stripeService: StripeService,
  ) {}

  /**
   * Generate payment intent for an order
   */
  async createPaymentIntent(
    orderId: string,
    userId: string,
    provider: PaymentProvider = PaymentProvider.STRIPE,
  ): Promise<{
    payment: Payment;
    clientSecret: string;
    providerOrderId: string;
  }> {
    // Verify order exists and belongs to user
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to you');
    }

    // Check if order is in PENDING status
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Cannot create payment for order with status ${order.status}`);
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (existingPayment) {
      // Return existing payment if already created
      return {
        payment: existingPayment,
        clientSecret: existingPayment.providerOrderId || '',
        providerOrderId: existingPayment.providerOrderId || '',
      };
    }

    // Generate idempotency key
    const idempotencyKey = `payment_${orderId}_${Date.now()}`;

    // Create payment intent with provider
    const { providerOrderId, clientSecret } = await this.createProviderPaymentIntent(
      order.totalAmount,
      provider,
      orderId,
      order.orderNumber,
    );

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        userId,
        amount: order.totalAmount,
        currency: 'INR',
        status: PaymentStatus.INITIATED,
        provider,
        providerOrderId,
        idempotencyKey,
      },
    });

    this.logger.log(`Payment intent created: ${payment.id} for order ${orderId}`);

    // Log payment intent creation
    await this.auditService.logPayment('PAYMENT_INTENT_CREATED', payment.id, userId, '0.0.0.0', {
      orderId,
      amount: order.totalAmount,
      provider,
      providerOrderId,
    });

    return {
      payment,
      clientSecret,
      providerOrderId,
    };
  }

  /**
   * Create payment provider integration (Real Stripe or Mock for others)
   */
  private async createProviderPaymentIntent(
    amount: number,
    provider: PaymentProvider,
    orderId: string,
    orderNumber: string,
  ): Promise<{ providerOrderId: string; clientSecret: string }> {
    switch (provider) {
      case PaymentProvider.STRIPE:
        try {
          const paymentIntent = await this.stripeService.createPaymentIntent(
            amount, // Amount in paise
            'inr',
            {
              orderId,
              orderNumber,
            },
          );

          return {
            providerOrderId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret || '',
          };
        } catch (error) {
          this.logger.error('Stripe Payment Intent creation failed', error);
          throw new BadRequestException('Failed to create Stripe payment intent');
        }

      case PaymentProvider.RAZORPAY:
        // Mock implementation for Razorpay
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return {
          providerOrderId: `order_${timestamp}${random}`,
          clientSecret: `order_${timestamp}${random}`,
        };

      case PaymentProvider.PAYPAL:
        return {
          providerOrderId: `PAYPAL-${Date.now()}`,
          clientSecret: `PAYPAL-${Date.now()}`,
        };

      case PaymentProvider.COD:
        return {
          providerOrderId: `COD-${Date.now()}`,
          clientSecret: `COD-${Date.now()}`,
        };

      default:
        return {
          providerOrderId: `payment_${Date.now()}`,
          clientSecret: `payment_${Date.now()}`,
        };
    }
  }

  /**
   * Process Stripe webhook event
   */
  async processStripeWebhook(event: Stripe.Event): Promise<Payment | null> {
    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        const successIntent = event.data.object as Stripe.PaymentIntent;
        return await this.handleStripePaymentSuccess(successIntent);

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        return await this.handleStripePaymentFailure(failedIntent);

      case 'payment_intent.canceled':
        const canceledIntent = event.data.object as Stripe.PaymentIntent;
        return await this.handleStripePaymentCanceled(canceledIntent);

      default:
        this.logger.log(`Unhandled Stripe event type: ${event.type}`);
        return null;
    }
  }

  /**
   * Handle Stripe payment success
   */
  private async handleStripePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId: paymentIntent.id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found for Stripe Payment Intent: ${paymentIntent.id}`);
    }

    // Check if already processed
    if (payment.status === PaymentStatus.SUCCESS) {
      this.logger.warn(`Payment ${payment.id} already processed as SUCCESS`);
      return payment;
    }

    return await this.handlePaymentSuccess(
      payment,
      paymentIntent.id,
      paymentIntent.payment_method?.toString(),
    );
  }

  /**
   * Handle Stripe payment failure
   */
  private async handleStripePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId: paymentIntent.id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found for Stripe Payment Intent: ${paymentIntent.id}`);
    }

    // Check if already processed
    if (payment.status === PaymentStatus.FAILED) {
      this.logger.warn(`Payment ${payment.id} already processed as FAILED`);
      return payment;
    }

    const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    return await this.handlePaymentFailure(payment, paymentIntent.id, failureReason);
  }

  /**
   * Handle Stripe payment canceled
   */
  private async handleStripePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId: paymentIntent.id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found for Stripe Payment Intent: ${paymentIntent.id}`);
    }

    // Check if already processed
    if (payment.status === PaymentStatus.FAILED || payment.status === PaymentStatus.SUCCESS) {
      this.logger.warn(`Payment ${payment.id} already processed with status ${payment.status}`);
      return payment;
    }

    return await this.handlePaymentFailure(payment, paymentIntent.id, 'Payment canceled by user');
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      // Razorpay signature verification
      const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (error) {
      this.logger.error('Signature verification failed', error);
      return false;
    }
  }

  /**
   * Process payment webhook
   */
  async processWebhook(webhookData: WebhookPayloadDto): Promise<Payment> {
    const {
      event,
      providerOrderId,
      providerPaymentId,
      signature,
      amount,
      status,
      paymentMethod,
      failureReason,
    } = webhookData;

    this.logger.log(`Processing webhook: ${event} for ${providerOrderId}`);

    // Find payment by provider order ID
    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found for provider order ID: ${providerOrderId}`);
    }

    // Log webhook received
    await this.auditService.logPayment(
      'PAYMENT_WEBHOOK_RECEIVED',
      payment.id,
      payment.userId,
      '0.0.0.0',
      {
        event,
        providerOrderId,
        status,
      },
    );

    // Check idempotency - if payment already processed, return existing
    if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.FAILED) {
      this.logger.warn(`Payment ${payment.id} already processed with status ${payment.status}`);
      return payment;
    }

    // Verify amount matches
    if (amount && amount !== payment.amount) {
      this.logger.error(`Amount mismatch: expected ${payment.amount}, got ${amount}`);
      throw new BadRequestException('Payment amount mismatch');
    }

    // Process based on event type
    if (event === 'payment.success' || status === 'SUCCESS') {
      return await this.handlePaymentSuccess(payment, providerPaymentId, paymentMethod);
    } else if (event === 'payment.failed' || status === 'FAILED') {
      return await this.handlePaymentFailure(payment, providerPaymentId, failureReason);
    } else {
      this.logger.warn(`Unknown webhook event: ${event}`);
      return payment;
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(
    payment: Payment,
    providerPaymentId: string | undefined,
    paymentMethod?: string,
  ): Promise<Payment> {
    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      // Update payment status
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          providerPaymentId: providerPaymentId || null,
          paymentMethod,
        },
        include: { order: true },
      });

      // Update order status to PAID
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID },
      });

      // Create order tracking event
      await tx.orderTracking.create({
        data: {
          orderId: payment.orderId,
          status: OrderStatus.PAID,
          note: 'Payment successful',
        },
      });

      this.logger.log(`Payment ${payment.id} successful, order ${payment.orderId} marked as PAID`);

      return updated;
    });

    // Log payment success
    await this.auditService.logPayment('PAYMENT_SUCCESS', payment.id, payment.userId, '0.0.0.0', {
      orderId: payment.orderId,
      amount: payment.amount,
      provider: payment.provider,
      providerPaymentId,
      paymentMethod,
    });

    return updatedPayment;
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(
    payment: Payment,
    providerPaymentId: string | undefined,
    failureReason?: string,
  ): Promise<Payment> {
    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      // Update payment status
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          providerPaymentId: providerPaymentId || null,
          failureReason,
        },
        include: { order: true },
      });

      // Update order status to PAYMENT_FAILED
      // Note: Inventory is NOT restored here - order still exists
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      // Create order tracking event
      await tx.orderTracking.create({
        data: {
          orderId: payment.orderId,
          status: OrderStatus.CANCELLED,
          note: `Payment failed: ${failureReason || 'Unknown reason'}`,
        },
      });

      // Restore inventory since payment failed
      const order = await tx.order.findUnique({
        where: { id: payment.orderId },
        include: { items: true },
      });

      if (order) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      this.logger.log(
        `Payment ${payment.id} failed, order ${payment.orderId} cancelled and inventory restored`,
      );

      return updated;
    });

    // Log payment failure
    await this.auditService.logPayment('PAYMENT_FAILED', payment.id, payment.userId, '0.0.0.0', {
      orderId: payment.orderId,
      amount: payment.amount,
      provider: payment.provider,
      providerPaymentId,
      failureReason,
    });

    return updatedPayment;
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get payment statistics (admin only)
   */
  async getPaymentStats(): Promise<{
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    pendingPayments: number;
    totalRevenue: number;
    revenueByProvider: Record<string, number>;
  }> {
    const [
      totalPayments,
      successfulPayments,
      failedPayments,
      pendingPayments,
      revenueResult,
      revenueByProviderResult,
    ] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: PaymentStatus.SUCCESS } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
      this.prisma.payment.count({
        where: {
          status: {
            in: [PaymentStatus.INITIATED, PaymentStatus.PENDING],
          },
        },
      }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['provider'],
        where: { status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
    ]);

    const revenueByProvider: Record<string, number> = {};
    for (const item of revenueByProviderResult) {
      revenueByProvider[item.provider] = item._sum.amount || 0;
    }

    return {
      totalPayments,
      successfulPayments,
      failedPayments,
      pendingPayments,
      totalRevenue: revenueResult._sum.amount || 0,
      revenueByProvider,
    };
  }

  /**
   * Initiate refund (admin only)
   */
  async initiateRefund(paymentId: string, reason?: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Can only refund successful payments');
    }

    // In production, call payment provider refund API
    // For now, just update status
    return await this.prisma.$transaction(async (tx) => {
      const refundedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          failureReason: reason,
        },
      });

      // Update order status
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.REFUNDED },
      });

      // Create tracking event
      await tx.orderTracking.create({
        data: {
          orderId: payment.orderId,
          status: OrderStatus.REFUNDED,
          note: `Refund initiated: ${reason || 'No reason provided'}`,
        },
      });

      this.logger.log(`Refund initiated for payment ${paymentId}`);

      return refundedPayment;
    });
  }

  /**
   * Mock: Simulate successful payment (for testing)
   */
  async simulatePaymentSuccess(orderId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.handlePaymentSuccess(payment, `mock_payment_${Date.now()}`, 'test_card');
  }

  /**
   * Mock: Simulate failed payment (for testing)
   */
  async simulatePaymentFailure(
    orderId: string,
    reason: string = 'Insufficient funds',
  ): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.handlePaymentFailure(payment, `mock_payment_${Date.now()}`, reason);
  }
}
