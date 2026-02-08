import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

@ObjectType()
export class Like {
  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  productId: string;

  @Field()
  createdAt: Date;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => Product, { nullable: true })
  product?: Product;
}
