import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Order } from './order.entity';

@ObjectType()
export class OrdersResponse {
  @Field(() => [Order])
  orders: Order[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  skip: number;

  @Field(() => Int)
  take: number;

  @Field()
  hasMore: boolean;
}
