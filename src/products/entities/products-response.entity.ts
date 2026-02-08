import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Product } from './product.entity';

@ObjectType()
export class ProductsResponse {
  @Field(() => [Product])
  products: Product[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  skip: number;

  @Field(() => Int)
  take: number;

  @Field(() => Boolean)
  hasMore: boolean;
}
