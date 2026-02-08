import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Category } from './category.entity';

@ObjectType()
export class Product {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  slug: string;

  @Field()
  description: string;

  @Field(() => Int)
  price: number; // in paise

  @Field(() => Int, { nullable: true })
  mrp?: number | null; // in paise

  @Field(() => Int)
  stock: number;

  @Field(() => Int)
  lowStockThreshold: number;

  @Field(() => [String])
  images: string[];

  @Field(() => String, { nullable: true })
  thumbnail?: string | null;

  @Field(() => Category, { nullable: true })
  category?: Category;

  @Field(() => String, { nullable: true })
  categoryId?: string;

  @Field(() => String, { nullable: true })
  metaTitle?: string | null;

  @Field(() => String, { nullable: true })
  metaDescription?: string | null;

  @Field()
  isActive: boolean;

  @Field()
  isFeatured: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Computed fields (will be resolved)
  @Field(() => Int, { nullable: true })
  likeCount?: number;

  @Field(() => Int, { nullable: true })
  reviewCount?: number;

  @Field(() => Number, { nullable: true })
  averageRating?: number;

  @Field({ nullable: true })
  isLikedByMe?: boolean;
}
