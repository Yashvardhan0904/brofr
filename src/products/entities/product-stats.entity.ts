import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class ProductStats {
  @Field(() => Int)
  totalProducts: number;

  @Field(() => Int)
  activeProducts: number;

  @Field(() => Int)
  inactiveProducts: number;

  @Field(() => Int)
  outOfStock: number;

  @Field(() => Int)
  lowStock: number;

  @Field(() => Int)
  featuredProducts: number;
}
