import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Product } from '../../products/entities/product.entity';

@ObjectType()
export class OrderItem {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  orderId: string;

  @Field(() => ID)
  productId: string;

  @Field()
  productTitle: string;

  @Field(() => String, { nullable: true })
  productImage?: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Int)
  pricePerUnit: number;

  @Field(() => Int)
  totalPrice: number;

  @Field(() => Product, { nullable: true })
  product?: Product;
}
