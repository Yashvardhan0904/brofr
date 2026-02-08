import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';
import { ProductFiltersInput } from './dto/product-filters.input';
import { Product } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new product (admin only)
   */
  async create(input: CreateProductInput): Promise<Product> {
    const { title, slug, categoryId, price, mrp, stock, images, ...rest } = input;

    // Check if slug already exists
    const existingProduct = await this.prisma.product.findUnique({
      where: { slug },
    });

    if (existingProduct) {
      throw new ConflictException('Product with this slug already exists');
    }

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Validate pricing
    if (mrp && price > mrp) {
      throw new BadRequestException('Price cannot be greater than MRP');
    }

    // Create product
    return this.prisma.product.create({
      data: {
        title,
        slug,
        categoryId,
        price,
        mrp,
        stock,
        images,
        ...rest,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Find all products with filters and pagination
   */
  async findAll(
    skip: number = 0,
    take: number = 20,
    filters?: ProductFiltersInput,
  ): Promise<{ products: Product[]; total: number }> {
    const where: any = {};

    // Apply filters
    if (filters) {
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        where.price = {};
        if (filters.minPrice !== undefined) {
          where.price.gte = filters.minPrice;
        }
        if (filters.maxPrice !== undefined) {
          where.price.lte = filters.maxPrice;
        }
      }

      if (filters.inStock !== undefined) {
        if (filters.inStock) {
          where.stock = { gt: 0 };
        } else {
          where.stock = 0;
        }
      }

      if (filters.isFeatured !== undefined) {
        where.isFeatured = filters.isFeatured;
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
    }

    // Default to active products only for public queries
    if (where.isActive === undefined) {
      where.isActive = true;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: true,
        },
        orderBy: filters?.sortBy
          ? { [filters.sortBy]: filters.sortOrder || 'desc' }
          : { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        reviews: {
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
          take: 10,
        },
      },
    });
  }

  /**
   * Find product by slug
   */
  async findBySlug(slug: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        reviews: {
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
          take: 10,
        },
      },
    });
  }

  /**
   * Update product (admin only)
   */
  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const product = await this.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check slug uniqueness if being updated
    if (input.slug && input.slug !== product.slug) {
      const existingProduct = await this.prisma.product.findUnique({
        where: { slug: input.slug },
      });

      if (existingProduct) {
        throw new ConflictException('Product with this slug already exists');
      }
    }

    // Verify category if being updated
    if (input.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: input.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Validate pricing if being updated
    const newPrice = input.price ?? product.price;
    const newMrp = input.mrp ?? product.mrp;

    if (newMrp && newPrice > newMrp) {
      throw new BadRequestException('Price cannot be greater than MRP');
    }

    return this.prisma.product.update({
      where: { id },
      data: input,
      include: {
        category: true,
      },
    });
  }

  /**
   * Delete product (admin only)
   */
  async delete(id: string): Promise<Product> {
    const product = await this.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Soft delete by setting isActive to false
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get featured products
   */
  async getFeatured(take: number = 10): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: {
        isFeatured: true,
        isActive: true,
        stock: { gt: 0 },
      },
      take,
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get products by category
   */
  async getByCategory(
    categoryId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{ products: Product[]; total: number }> {
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          categoryId,
          isActive: true,
        },
        skip,
        take,
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({
        where: {
          categoryId,
          isActive: true,
        },
      }),
    ]);

    return { products, total };
  }

  /**
   * Update stock (internal use)
   */
  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const newStock = product.stock + quantity;

    if (newStock < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    return this.prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });
  }

  /**
   * Check if product is in stock
   */
  async isInStock(id: string, quantity: number = 1): Promise<boolean> {
    const product = await this.findById(id);

    if (!product || !product.isActive) {
      return false;
    }

    return product.stock >= quantity;
  }

  /**
   * Get product statistics (admin only)
   */
  async getStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    outOfStock: number;
    lowStock: number;
    featuredProducts: number;
  }> {
    const [totalProducts, activeProducts, inactiveProducts, outOfStock, featuredProducts] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.product.count({ where: { isActive: false } }),
        this.prisma.product.count({ where: { stock: 0 } }),
        this.prisma.product.count({ where: { isFeatured: true } }),
      ]);

    // Calculate low stock count using raw SQL for field comparison
    // Prisma doesn't support comparing two fields in where clause
    const lowStockResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM "Product"
      WHERE "stock" > 0 
        AND "stock" <= "lowStockThreshold"
    `;

    const lowStock = Number(lowStockResult[0].count);

    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      outOfStock,
      lowStock,
      featuredProducts,
    };
  }
}
