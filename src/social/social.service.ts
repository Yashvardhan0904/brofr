import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentInput } from './dto/create-comment.input';
import { UpdateCommentInput } from './dto/update-comment.input';
import { CreateReviewInput } from './dto/create-review.input';
import { UpdateReviewInput } from './dto/update-review.input';
import { Like, Comment, Review, Role } from '@prisma/client';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // LIKES
  // ============================================

  /**
   * Like a product (idempotent)
   */
  async likeProduct(userId: string, productId: string): Promise<Like> {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Create like (upsert for idempotency)
    return this.prisma.like.upsert({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      create: {
        userId,
        productId,
      },
      update: {}, // No update needed, just return existing
    });
  }

  /**
   * Unlike a product
   */
  async unlikeProduct(userId: string, productId: string): Promise<boolean> {
    try {
      await this.prisma.like.delete({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });
      return true;
    } catch (error) {
      // Like doesn't exist, that's fine
      return false;
    }
  }

  /**
   * Get like count for a product
   */
  async getLikeCount(productId: string): Promise<number> {
    return this.prisma.like.count({
      where: { productId },
    });
  }

  /**
   * Check if user has liked a product
   */
  async hasUserLiked(userId: string, productId: string): Promise<boolean> {
    const like = await this.prisma.like.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return !!like;
  }

  /**
   * Get all likes for a product
   */
  async getProductLikes(
    productId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{ likes: Like[]; total: number }> {
    const [likes, total] = await Promise.all([
      this.prisma.like.findMany({
        where: { productId },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.like.count({ where: { productId } }),
    ]);

    return { likes, total };
  }

  // ============================================
  // COMMENTS
  // ============================================

  /**
   * Create a comment
   */
  async createComment(userId: string, input: CreateCommentInput): Promise<Comment> {
    const { productId, content } = input;

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate content length
    if (content.length < 1 || content.length > 1000) {
      throw new BadRequestException('Comment must be between 1 and 1000 characters');
    }

    // Create comment
    return this.prisma.comment.create({
      data: {
        userId,
        productId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Update a comment (ownership enforced)
   */
  async updateComment(
    commentId: string,
    userId: string,
    userRole: Role,
    input: UpdateCommentInput,
  ): Promise<Comment> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check ownership (only author can edit, not even admins)
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Validate content length
    if (input.content.length < 1 || input.content.length > 1000) {
      throw new BadRequestException('Comment must be between 1 and 1000 characters');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content: input.content },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Delete a comment (ownership or admin)
   */
  async deleteComment(commentId: string, userId: string, userRole: Role): Promise<boolean> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check ownership or admin role
    if (comment.userId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You can only delete your own comments or be an admin');
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    return true;
  }

  /**
   * Get comments for a product
   */
  async getProductComments(
    productId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{ comments: Comment[]; total: number }> {
    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { productId },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.comment.count({ where: { productId } }),
    ]);

    return { comments, total };
  }

  /**
   * Get user's comments
   */
  async getUserComments(
    userId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{ comments: Comment[]; total: number }> {
    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { userId },
        skip,
        take,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.comment.count({ where: { userId } }),
    ]);

    return { comments, total };
  }

  // ============================================
  // REVIEWS
  // ============================================

  /**
   * Create a review
   */
  async createReview(userId: string, input: CreateReviewInput): Promise<Review> {
    const { productId, rating, title, message } = input;

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Validate message length
    if (message.length < 10 || message.length > 2000) {
      throw new BadRequestException('Review message must be between 10 and 2000 characters');
    }

    // Check if user has already reviewed this product
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product. Use update instead.');
    }

    // Create review
    return this.prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        title,
        message,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Update a review (ownership enforced)
   */
  async updateReview(reviewId: string, userId: string, input: UpdateReviewInput): Promise<Review> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Check ownership
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only edit your own reviews');
    }

    // Validate rating if provided
    if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Validate message length if provided
    if (input.message !== undefined && (input.message.length < 10 || input.message.length > 2000)) {
      throw new BadRequestException('Review message must be between 10 and 2000 characters');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: input,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Delete a review (ownership or admin)
   */
  async deleteReview(reviewId: string, userId: string, userRole: Role): Promise<boolean> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Check ownership or admin role
    if (review.userId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You can only delete your own reviews or be an admin');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    return true;
  }

  /**
   * Get reviews for a product
   */
  async getProductReviews(
    productId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{ reviews: Review[]; total: number; averageRating: number }> {
    const [reviews, total, avgResult] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          productId,
          isHidden: false,
        },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({
        where: {
          productId,
          isHidden: false,
        },
      }),
      this.prisma.review.aggregate({
        where: {
          productId,
          isHidden: false,
        },
        _avg: {
          rating: true,
        },
      }),
    ]);

    return {
      reviews,
      total,
      averageRating: avgResult._avg.rating || 0,
    };
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(
    userId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{ reviews: Review[]; total: number }> {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId },
        skip,
        take,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { userId } }),
    ]);

    return { reviews, total };
  }

  /**
   * Verify a review (admin only)
   */
  async verifyReview(reviewId: string): Promise<Review> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { isVerified: true },
    });
  }

  /**
   * Hide/unhide a review (admin only)
   */
  async toggleReviewVisibility(reviewId: string): Promise<Review> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { isHidden: !review.isHidden },
    });
  }

  /**
   * Get review count for a product
   */
  async getReviewCount(productId: string): Promise<number> {
    return this.prisma.review.count({
      where: {
        productId,
        isHidden: false,
      },
    });
  }

  /**
   * Get average rating for a product
   */
  async getAverageRating(productId: string): Promise<number> {
    const result = await this.prisma.review.aggregate({
      where: {
        productId,
        isHidden: false,
      },
      _avg: {
        rating: true,
      },
    });

    return result._avg.rating || 0;
  }
}
