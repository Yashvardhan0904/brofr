import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Resolver(() => Category)
export class CategoriesResolver {
  constructor(private categoriesService: CategoriesService) {}

  /**
   * Get all categories (public)
   */
  @Query(() => [Category], { description: 'Get all categories' })
  async categories(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  /**
   * Get root categories (public)
   */
  @Query(() => [Category], { description: 'Get root categories with children' })
  async rootCategories(): Promise<Category[]> {
    return this.categoriesService.findRootCategories();
  }

  /**
   * Get category by ID (public)
   */
  @Query(() => Category, {
    nullable: true,
    description: 'Get category by ID',
  })
  async category(@Args('id', { type: () => ID }) id: string): Promise<Category | null> {
    return this.categoriesService.findById(id);
  }

  /**
   * Get category by slug (public)
   */
  @Query(() => Category, {
    nullable: true,
    description: 'Get category by slug',
  })
  async categoryBySlug(@Args('slug') slug: string): Promise<Category | null> {
    return this.categoriesService.findBySlug(slug);
  }

  /**
   * Create category (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => Category, { description: 'Create category (admin only)' })
  async createCategory(@Args('input') input: CreateCategoryInput): Promise<Category> {
    return this.categoriesService.create(input);
  }

  /**
   * Update category (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => Category, { description: 'Update category (admin only)' })
  async updateCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCategoryInput,
  ): Promise<Category> {
    return this.categoriesService.update(id, input);
  }

  /**
   * Delete category (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => Category, { description: 'Delete category (admin only)' })
  async deleteCategory(@Args('id', { type: () => ID }) id: string): Promise<Category> {
    return this.categoriesService.delete(id);
  }
}
