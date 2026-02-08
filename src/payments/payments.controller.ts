import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';

@Controller('webhooks')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private paymentsService: PaymentsService,
    private stripeService: StripeService,
  ) {}

  /**
   * Stripe webhook endpoint
   * POST /webhooks/stripe
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!signature) {
        throw new UnauthorizedException('Missing Stripe signature');
      }

      // Get raw body for signature verification
      const rawBody = req.rawBody;
      if (!rawBody) {
        throw new BadRequestException('Missing request body');
      }

      // Verify webhook signature and construct event
      const event = this.stripeService.verifyWebhookSignature(rawBody, signature);

      this.logger.log(`Received Stripe webhook: ${event.type}`);

      // Process webhook
      await this.paymentsService.processStripeWebhook(event);

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error('Stripe webhook processing failed', error);

      // Return 400 for signature verification failures
      if (error.message?.includes('signature')) {
        throw new UnauthorizedException('Invalid webhook signature');
      }

      // Return 200 for other errors to prevent Stripe retries
      return {
        success: false,
        message: error.message || 'Webhook processing failed',
      };
    }
  }

  /**
   * Payment webhook endpoint (Generic/Razorpay)
   * POST /webhooks/payment
   */
  @Post('payment')
  @HttpCode(HttpStatus.OK)
  async handlePaymentWebhook(
    @Body() payload: WebhookPayloadDto,
    @Headers('x-razorpay-signature') signature?: string,
    @Headers('x-webhook-signature') genericSignature?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('Received payment webhook', {
        event: payload.event,
        providerOrderId: payload.providerOrderId,
      });

      // Verify webhook signature (if provided)
      const webhookSignature = signature || genericSignature;
      if (webhookSignature) {
        const webhookSecret = process.env.WEBHOOK_SECRET || 'test_secret';
        const isValid = this.paymentsService.verifyWebhookSignature(
          JSON.stringify(payload),
          webhookSignature,
          webhookSecret,
        );

        if (!isValid) {
          this.logger.error('Invalid webhook signature');
          throw new UnauthorizedException('Invalid webhook signature');
        }
      }

      // Process webhook
      const payment = await this.paymentsService.processWebhook(payload);

      this.logger.log(`Webhook processed successfully: ${payment.id}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error('Webhook processing failed', error);

      // Return 200 even on error to prevent provider retries
      // Log error for investigation
      return {
        success: false,
        message: error.message || 'Webhook processing failed',
      };
    }
  }

  /**
   * Test endpoint to simulate payment success
   * POST /webhooks/test/success
   */
  @Post('test/success')
  @HttpCode(HttpStatus.OK)
  async testPaymentSuccess(
    @Body() body: { orderId: string },
  ): Promise<{ success: boolean; message: string }> {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Test endpoints disabled in production');
    }

    try {
      const payment = await this.paymentsService.simulatePaymentSuccess(body.orderId);

      return {
        success: true,
        message: `Payment ${payment.id} marked as successful`,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Test endpoint to simulate payment failure
   * POST /webhooks/test/failure
   */
  @Post('test/failure')
  @HttpCode(HttpStatus.OK)
  async testPaymentFailure(
    @Body() body: { orderId: string; reason?: string },
  ): Promise<{ success: boolean; message: string }> {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Test endpoints disabled in production');
    }

    try {
      const payment = await this.paymentsService.simulatePaymentFailure(body.orderId, body.reason);

      return {
        success: true,
        message: `Payment ${payment.id} marked as failed`,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
