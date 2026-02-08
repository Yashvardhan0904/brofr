import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment } from '../orders/entities/payment.entity';
import { PaymentIntent } from './entities/payment-intent.entity';
import { PaymentStats } from './entities/payment-stats.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserPayload } from '../common/types/user-payload.type';
import { Role, PaymentProvider } from '@prisma/client';

@Resolver(() => Payment)
export class PaymentsResolver {
  constructor(private paymentsService: PaymentsService) {}

  /**
   * Create payment intent (authenticated)
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => PaymentIntent, { description: 'Create payment intent' })
  async createPaymentIntent(
    @CurrentUser() user: UserPayload,
    @Args('orderId', { type: () => ID }) orderId: string,
    @Args('provider', {
      type: () => PaymentProvider,
      nullable: true,
      defaultValue: PaymentProvider.STRIPE,
    })
    provider: PaymentProvider,
  ): Promise<PaymentIntent> {
    const result = await this.paymentsService.createPaymentIntent(orderId, user.userId, provider);

    return {
      paymentId: result.payment.id,
      orderId: result.payment.orderId,
      amount: result.payment.amount,
      currency: result.payment.currency,
      clientSecret: result.clientSecret,
      providerOrderId: result.providerOrderId,
    };
  }

  /**
   * Get payment by order ID (authenticated, ownership)
   */
  @UseGuards(JwtAuthGuard)
  @Query(() => Payment, {
    nullable: true,
    description: 'Get payment by order ID',
  })
  async paymentByOrderId(
    @CurrentUser() user: UserPayload,
    @Args('orderId', { type: () => ID }) orderId: string,
  ): Promise<Payment | null> {
    const payment = await this.paymentsService.getPaymentByOrderId(orderId);

    if (!payment) {
      return null;
    }

    // Check ownership (admins can view all payments)
    if (payment.userId !== user.userId && user.role !== Role.ADMIN) {
      return null;
    }

    return payment;
  }

  /**
   * Get payment statistics (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Query(() => PaymentStats, {
    description: 'Get payment statistics (admin only)',
  })
  async paymentStats(): Promise<PaymentStats> {
    return this.paymentsService.getPaymentStats();
  }

  /**
   * Initiate refund (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => Payment, { description: 'Initiate refund (admin only)' })
  async initiateRefund(
    @Args('paymentId', { type: () => ID }) paymentId: string,
    @Args('reason', { nullable: true }) reason?: string,
  ): Promise<Payment> {
    return this.paymentsService.initiateRefund(paymentId, reason);
  }
}
