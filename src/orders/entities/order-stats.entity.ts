import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class OrderStats {
  @Field(() => Int)
  totalOrders: number;

  @Field(() => Int)
  pendingOrders: number;

  @Field(() => Int)
  paidOrders: number;

  @Field(() => Int)
  processingOrders: number;

  @Field(() => Int)
  shippedOrders: number;

  @Field(() => Int)
  deliveredOrders: number;

  @Field(() => Int)
  cancelledOrders: number;

  @Field(() => Int)
  totalRevenue: number;
}
