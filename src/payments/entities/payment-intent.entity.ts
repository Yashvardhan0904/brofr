import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class PaymentIntent {
  @Field(() => ID)
  paymentId: string;

  @Field(() => ID)
  orderId: string;

  @Field(() => Int)
  amount: number;

  @Field()
  currency: string;

  @Field()
  clientSecret: string;

  @Field()
  providerOrderId: string;
}
