import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

@ObjectType()
export class Review {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  rating: number;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field()
  message: string;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  productId: string;

  @Field()
  isVerified: boolean;

  @Field()
  isHidden: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => Product, { nullable: true })
  product?: Product;
}
