import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { Review } from './review.entity';

@ObjectType()
export class ReviewsResponse {
  @Field(() => [Review])
  reviews: Review[];

  @Field(() => Int)
  total: number;

  @Field(() => Float)
  averageRating: number;

  @Field(() => Int)
  skip: number;

  @Field(() => Int)
  take: number;

  @Field()
  hasMore: boolean;
}
