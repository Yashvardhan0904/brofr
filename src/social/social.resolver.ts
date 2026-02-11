import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { Like } from './entities/like.entity';
import { Comment } from './entities/comment.entity';
import { Review } from './entities/review.entity';
import { CommentsResponse } from './entities/comments-response.entity';
import { ReviewsResponse } from './entities/reviews-response.entity';
import { Product } from '../products/entities/product.entity';
import { CreateCommentInput } from './dto/create-comment.input';
import { UpdateCommentInput } from './dto/update-comment.input';
import { CreateReviewInput } from './dto/create-review.input';
import { UpdateReviewInput } from './dto/update-review.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserPayload } from '../common/types/user-payload.type';
import { Role } from '@prisma/client';

@Resolver(() => Like)
export class LikesResolver {
  constructor(private socialService: SocialService) {}

  /**
   * Like a product (authenticated)
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Like, { description: 'Like a product' })
  async likeProduct(
    @CurrentUser() user: UserPayload,
    @Args('productId', { type: () => ID }) productId: string,
  ): Promise<Like> {
    return this.socialService.likeProduct(user.userId, productId);
  }

  /**
   * Unlike a product (authenticated)
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, { description: 'Unlike a product' })
  async unlikeProduct(
    @CurrentUser() user: UserPayload,
    @Args('productId', { type: () => ID }) productId: string,
  ): Promise<boolean> {
    return this.socialService.unlikeProduct(user.userId, productId);
  }

  /**
   * Get likes for a product (public)
   */
  @Query(() => [Like], { description: 'Get likes for a product' })
  async productLikes(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number,
  ): Promise<Like[]> {
    const { likes } = await this.socialService.getProductLikes(productId, skip, take);
    return likes;
  }
}

@Resolver(() => Comment)
export class CommentsResolver {
  constructor(private socialService: SocialService) {}

  /**
   * Create a comment (authenticated)
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Comment, { description: 'Create a comment' })
  async createComment(
    @CurrentUser() user: UserPayload,
    @Args('input') input: CreateCommentInput,
  ): Promise<Comment> {
    return this.socialService.createComment(user.userId, input);
  }

  /**
   * Update a comment (authenticated, ownership)
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Comment, { description: 'Update a comment' })
  async updateComment(
    @CurrentUser() user: UserPayload,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCommentInput,
  ): Promise<Comment> {
    return this.socialService.updateComment(id, user.userId, user.role, input);
  }

  /**
   * Delete a comment (authenticated, ownership or admin)
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, { description: 'Delete a comment' })
  async deleteComment(
    @CurrentUser() user: UserPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.socialService.deleteComment(id, user.userId, user.role);
  }

  /**
   * Get comments for a product (public)
   */
  @Query(() => CommentsResponse, { description: 'Get comments for a product' })
  async productComments(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number,
  ): Promise<CommentsResponse> {
    const { comments, total } = await this.socialService.getProductComments(productId, skip, take);

    return {
      comments,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Get user's comments (authenticated)
   */
  @UseGuards(JwtAuthGuard)
  @Query(() => CommentsResponse, { description: 'Get user comments' })
  async myComments(
    @CurrentUser() user: UserPayload,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number,
  ): Promise<CommentsResponse> {
    const { comments, total } = await this.socialService.getUserComments(user.userId, skip, take);

    return {
      comments,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }
}

@Resolver(() => Review)
export class ReviewsResolver {
  constructor(private socialService: SocialService) {}

  /**
   * Create a review (authenticated)
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Review, { description: 'Create a review' })
  async createReview(
    @CurrentUser() user: UserPayload,
    @Args('input') input: CreateReviewInput,
  ): Promise<Review> {
    return this.socialService.createReview(user.userId, input);
  }

  /**
   * Update a review (authenticated, ownership)
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Review, { description: 'Update a review' })
  async updateReview(
    @CurrentUser() user: UserPayload,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateReviewInput,
  ): Promise<Review> {
    return this.socialService.updateReview(id, user.userId, input);
  }

  /**
   * Delete a review (authenticated, ownership or admin)
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, { description: 'Delete a review' })
  async deleteReview(
    @CurrentUser() user: UserPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.socialService.deleteReview(id, user.userId, user.role);
  }

  /**
   * Get reviews for a product (public)
   */
  @Query(() => ReviewsResponse, { description: 'Get reviews for a product' })
  async productReviews(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number,
  ): Promise<ReviewsResponse> {
    const { reviews, total, averageRating } = await this.socialService.getProductReviews(
      productId,
      skip,
      take,
    );

    return {
      reviews,
      total,
      averageRating,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Get user's reviews (authenticated)
   */
  @UseGuards(JwtAuthGuard)
  @Query(() => ReviewsResponse, { description: 'Get user reviews' })
  async myReviews(
    @CurrentUser() user: UserPayload,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number,
  ): Promise<ReviewsResponse> {
    const { reviews, total } = await this.socialService.getUserReviews(user.userId, skip, take);

    return {
      reviews,
      total,
      averageRating: 0, // Not applicable for user reviews
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Verify a review (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => Review, { description: 'Verify a review (admin only)' })
  async verifyReview(@Args('id', { type: () => ID }) id: string): Promise<Review> {
    return this.socialService.verifyReview(id);
  }

  /**
   * Toggle review visibility (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => Review, {
    description: 'Toggle review visibility (admin only)',
  })
  async toggleReviewVisibility(@Args('id', { type: () => ID }) id: string): Promise<Review> {
    return this.socialService.toggleReviewVisibility(id);
  }
}

@Resolver(() => Product)
export class ProductSocialResolver {
  constructor(private socialService: SocialService) {}

  /**
   * Field resolver: likeCount
   */
  @ResolveField(() => Int, { nullable: true })
  async likeCount(@Parent() product: Product): Promise<number> {
    return this.socialService.getLikeCount(product.id);
  }

  /**
   * Field resolver: reviewCount
   */
  @ResolveField(() => Int, { nullable: true })
  async reviewCount(@Parent() product: Product): Promise<number> {
    return this.socialService.getReviewCount(product.id);
  }

  /**
   * Field resolver: averageRating - Returns float (e.g., 4.5)
   */
  @ResolveField(() => Number, { nullable: true })
  async averageRating(@Parent() product: Product): Promise<number> {
    return this.socialService.getAverageRating(product.id);
  }

  /**
   * Field resolver: isLikedByMe (requires authentication)
   */
  @ResolveField(() => Boolean, { nullable: true })
  async isLikedByMe(
    @Parent() product: Product,
    @CurrentUser() user?: UserPayload,
  ): Promise<boolean | null> {
    // Return null for unauthenticated users
    if (!user || !user.userId) {
      return null;
    }
    return this.socialService.hasUserLiked(user.userId, product.id);
  }
}

// Export combined resolver
@Resolver()
export class SocialResolver {}

export const SocialResolvers = [
  LikesResolver,
  CommentsResolver,
  ReviewsResolver,
  ProductSocialResolver,
  SocialResolver,
];
