import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';
import { Category } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new category (admin only)
   */
  async create(input: CreateCategoryInput): Promise<Category> {
    const { name, slug, parentId } = input;

    // Check if slug already exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this slug already exists');
    }

    // Verify parent category exists if provided
    if (parentId) {
      const parentCategory = await this.prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }
    }

    return this.prisma.category.create({
      data: input,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  /**
   * Find all categories
   */
  async findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find root categories (no parent)
   */
  async findRootCategories(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
            _count: {
              select: { products: true },
            },
          },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find category by ID
   */
  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: {
          where: { isActive: true },
          take: 10,
        },
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: true,
        products: {
          where: { isActive: true },
          take: 10,
        },
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /**
   * Update category (admin only)
   */
  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const category = await this.findById(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check slug uniqueness if being updated
    if (input.slug && input.slug !== category.slug) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { slug: input.slug },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this slug already exists');
      }
    }

    // Verify parent category if being updated
    if (input.parentId) {
      // Prevent circular reference
      if (input.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      const parentCategory = await this.prisma.category.findUnique({
        where: { id: input.parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }

      // Check if new parent is a child of current category
      const isDescendant = await this.isDescendant(id, input.parentId);
      if (isDescendant) {
        throw new BadRequestException('Cannot set a descendant category as parent');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: input,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  /**
   * Delete category (admin only)
   */
  async delete(id: string): Promise<Category> {
    const category = await this.findById(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has products
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new BadRequestException('Cannot delete category with existing products');
    }

    // Check if category has children
    const childrenCount = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      throw new BadRequestException('Cannot delete category with sub-categories');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  /**
   * Check if a category is a descendant of another
   */
  private async isDescendant(ancestorId: string, descendantId: string): Promise<boolean> {
    const descendant = await this.prisma.category.findUnique({
      where: { id: descendantId },
      include: { parent: true },
    });

    if (!descendant || !descendant.parent) {
      return false;
    }

    if (descendant.parent.id === ancestorId) {
      return true;
    }

    return this.isDescendant(ancestorId, descendant.parent.id);
  }
}
