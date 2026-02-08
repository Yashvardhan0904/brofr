import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { PaymentStatus, PaymentProvider } from '@prisma/client';

// Register enums for GraphQL
registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
  description: 'Payment status enum',
});

registerEnumType(PaymentProvider, {
  name: 'PaymentProvider',
  description: 'Payment provider enum',
});

@ObjectType()
export class Payment {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  orderId: string;

  @Field(() => ID)
  userId: string;

  @Field(() => Int)
  amount: number;

  @Field()
  currency: string;

  @Field(() => PaymentStatus)
  status: PaymentStatus;

  @Field(() => PaymentProvider)
  provider: PaymentProvider;

  @Field(() => String, { nullable: true })
  providerOrderId?: string | null;

  @Field(() => String, { nullable: true })
  providerPaymentId?: string | null;

  @Field(() => String, { nullable: true })
  paymentMethod?: string | null;

  @Field(() => String, { nullable: true })
  failureReason?: string | null;

  @Field()
  idempotencyKey: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
