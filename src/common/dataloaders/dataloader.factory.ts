import DataLoader = require('dataloader');
import { PrismaService } from '../../prisma/prisma.service';

/**
 * DataLoader Factory
 *
 * Creates DataLoader instances for batching and caching database queries.
 * Prevents N+1 query problems in GraphQL resolvers.
 */
export class DataLoaderFactory {
  constructor(private prisma: PrismaService) {}

  /**
   * Create all DataLoaders for a request
   */
  createLoaders() {
    return {
      productLoader: this.createProductLoader(),
      userLoader: this.createUserLoader(),
      categoryLoader: this.createCategoryLoader(),
      productLikeCountLoader: this.createProductLikeCountLoader(),
      reviewCountLoader: this.createReviewCountLoader(),
      averageRatingLoader: this.createAverageRatingLoader(),
    };
  }

  /**
   * Product DataLoader
   *
   * Batches product lookups by ID
   */
  private createProductLoader() {
    return new DataLoader<string, any>(async (productIds: readonly string[]) => {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: [...productIds] },
        },
      });

      // Create a map for O(1) lookup
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Return products in the same order as requested IDs
      return productIds.map((id) => productMap.get(id) || null);
    });
  }

  /**
   * User DataLoader
   *
   * Batches user lookups by ID
   */
  private createUserLoader() {
    return new DataLoader<string, any>(async (userIds: readonly string[]) => {
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: [...userIds] },
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Don't include passwordHash for security
        },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));
      return userIds.map((id) => userMap.get(id) || null);
    });
  }

  /**
   * Category DataLoader
   *
   * Batches category lookups by ID
   */
  private createCategoryLoader() {
    return new DataLoader<string, any>(async (categoryIds: readonly string[]) => {
      const categories = await this.prisma.category.findMany({
        where: {
          id: { in: [...categoryIds] },
        },
      });

      const categoryMap = new Map(categories.map((c) => [c.id, c]));
      return categoryIds.map((id) => categoryMap.get(id) || null);
    });
  }

  /**
   * Product Like Count DataLoader
   *
   * Batches like count queries for products
   */
  private createProductLikeCountLoader() {
    return new DataLoader<string, number>(async (productIds: readonly string[]) => {
      const likes = await this.prisma.like.groupBy({
        by: ['productId'],
        where: {
          productId: { in: [...productIds] },
        },
        _count: {
          _all: true,
        },
      });

      const likeCountMap = new Map(likes.map((l) => [l.productId, l._count._all]));
      return productIds.map((id) => likeCountMap.get(id) || 0);
    });
  }

  /**
   * Review Count DataLoader
   *
   * Batches review count queries for products
   */
  private createReviewCountLoader() {
    return new DataLoader<string, number>(async (productIds: readonly string[]) => {
      const reviews = await this.prisma.review.groupBy({
        by: ['productId'],
        where: {
          productId: { in: [...productIds] },
        },
        _count: {
          id: true,
        },
      });

      const reviewCountMap = new Map(reviews.map((r) => [r.productId, r._count.id]));
      return productIds.map((id) => reviewCountMap.get(id) || 0);
    });
  }

  /**
   * Average Rating DataLoader
   *
   * Batches average rating calculations for products
   */
  private createAverageRatingLoader() {
    return new DataLoader<string, number>(async (productIds: readonly string[]) => {
      const ratings = await this.prisma.review.groupBy({
        by: ['productId'],
        where: {
          productId: { in: [...productIds] },
        },
        _avg: {
          rating: true,
        },
      });

      const ratingMap = new Map(ratings.map((r) => [r.productId, r._avg.rating || 0]));
      return productIds.map((id) => ratingMap.get(id) || 0);
    });
  }
}
