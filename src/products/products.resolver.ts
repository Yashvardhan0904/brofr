import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ProductsResponse } from './entities/products-response.entity';
import { ProductStats } from './entities/product-stats.entity';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';
import { ProductFiltersInput } from './dto/product-filters.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Resolver(() => Product)
export class ProductsResolver {
  constructor(private productsService: ProductsService) {}

  /**
   * Get all products (public)
   */
  @Query(() => ProductsResponse, { description: 'Get all products with filters' })
  async products(
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number,
    @Args('filters', { nullable: true }) filters?: ProductFiltersInput,
  ): Promise<ProductsResponse> {
    const { products, total } = await this.productsService.findAll(skip, take, filters);

    return {
      products,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Get product by ID (public)
   */
  @Query(() => Product, {
    nullable: true,
    description: 'Get product by ID',
  })
  async product(@Args('id', { type: () => ID }) id: string): Promise<Product | null> {
    return this.productsService.findById(id);
  }

  /**
   * Get product by slug (public)
   */
  @Query(() => Product, {
    nullable: true,
    description: 'Get product by slug',
  })
  async productBySlug(@Args('slug') slug: string): Promise<Product | null> {
    return this.productsService.findBySlug(slug);
  }

  /**
   * Get featured products (public)
   */
  @Query(() => [Product], { description: 'Get featured products' })
  async featuredProducts(
    @Args('take', { type: () => Int, nullable: true, defaultValue: 10 })
    take: number,
  ): Promise<Product[]> {
    return this.productsService.getFeatured(take);
  }

  /**
   * Get products by category (public)
   */
  @Query(() => ProductsResponse, { description: 'Get products by category' })
  async productsByCategory(
    @Args('categoryId', { type: () => ID }) categoryId: string,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number,
  ): Promise<ProductsResponse> {
    const { products, total } = await this.productsService.getByCategory(categoryId, skip, take);

    return {
      products,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Create product (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => Product, { description: 'Create product (admin only)' })
  async createProduct(@Args('input') input: CreateProductInput): Promise<Product> {
    return this.productsService.create(input);
  }

  /**
   * Update product (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => Product, { description: 'Update product (admin only)' })
  async updateProduct(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateProductInput,
  ): Promise<Product> {
    return this.productsService.update(id, input);
  }

  /**
   * Delete product (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => Product, { description: 'Delete product (admin only)' })
  async deleteProduct(@Args('id', { type: () => ID }) id: string): Promise<Product> {
    return this.productsService.delete(id);
  }

  /**
   * Get product statistics (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Query(() => ProductStats, {
    description: 'Get product statistics (admin only)',
  })
  async productStats(): Promise<ProductStats> {
    return this.productsService.getStats();
  }
}
