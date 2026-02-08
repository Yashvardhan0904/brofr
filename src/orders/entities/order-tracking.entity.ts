import { ObjectType, Field, ID } from '@nestjs/graphql';
import { OrderStatus } from '@prisma/client';

@ObjectType()
export class OrderTracking {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  orderId: string;

  @Field(() => OrderStatus)
  status: OrderStatus;

  @Field(() => String, { nullable: true })
  note?: string;

  @Field(() => String, { nullable: true })
  location?: string;

  @Field()
  createdAt: Date;
}
