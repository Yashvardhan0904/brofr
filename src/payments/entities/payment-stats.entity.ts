import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
export class PaymentStats {
  @Field(() => Int)
  totalPayments: number;

  @Field(() => Int)
  successfulPayments: number;

  @Field(() => Int)
  failedPayments: number;

  @Field(() => Int)
  pendingPayments: number;

  @Field(() => Int)
  totalRevenue: number;

  @Field(() => GraphQLJSONObject)
  revenueByProvider: Record<string, number>;
}
