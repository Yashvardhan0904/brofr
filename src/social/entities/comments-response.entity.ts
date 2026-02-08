import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Comment } from './comment.entity';

@ObjectType()
export class CommentsResponse {
  @Field(() => [Comment])
  comments: Comment[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  skip: number;

  @Field(() => Int)
  take: number;

  @Field()
  hasMore: boolean;
}
