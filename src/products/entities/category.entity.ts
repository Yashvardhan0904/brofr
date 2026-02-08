import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Product } from './product.entity';

@ObjectType()
export class Category {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  image?: string | null;

  @Field(() => String, { nullable: true })
  parentId?: string | null;

  @Field(() => Category, { nullable: true })
  parent?: Category;

  @Field(() => [Category], { nullable: true })
  children?: Category[];

  @Field(() => [Product], { nullable: true })
  products?: Product[];

  @Field(() => Int, { nullable: true })
  productCount?: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
