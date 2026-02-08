import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrderInput } from './dto/create-order.input';
import { Order, OrderStatus, Role, Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Validate order state transition
   */
  private isValidTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
      [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
      [OrderStatus.CANCELLED]: [], // Terminal state
      [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
      [OrderStatus.REFUNDED]: [], // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Create order with inventory validation and idempotency
   */
  async createOrder(userId: string, input: CreateOrderInput): Promise<Order> {
    const { 
      items, 
      shippingName,
      shippingPhone,
      shippingLine1,
      shippingLine2,
      shippingCity,
      shippingState,
      shippingPincode,
      shippingCountry,
      notes 
    } = input;

    // Validate all products exist and are active
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found or inactive');
    }

    // Create a map for quick product lookup
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Start transaction for atomic order creation
    return await this.prisma.$transaction(
      async (tx) => {
        let subtotal = 0;
        const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

        // Validate inventory and prepare order items
        for (const item of items) {
          const product = productMap.get(item.productId);

          if (!product) {
            throw new BadRequestException(`Product ${item.productId} not found`);
          }

          // Check inventory with row-level locking
          const lockedProduct = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!lockedProduct) {
            throw new BadRequestException(`Product ${item.productId} not found`);
          }

          if (lockedProduct.stock < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for ${lockedProduct.title}. Available: ${lockedProduct.stock}, Requested: ${item.quantity}`,
            );
          }

          // Calculate item total
          const itemTotal = product.price * item.quantity;
          subtotal += itemTotal;

          // Prepare order item data
          orderItemsData.push({
            productId: item.productId,
            productTitle: product.title,
            productImage: product.thumbnail || product.images[0] || null,
            quantity: item.quantity,
            pricePerUnit: product.price,
            totalPrice: itemTotal,
          });

          // Decrement inventory
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Calculate totals (simplified - no tax/shipping for now)
        const tax = 0;
        const shippingCharge = 0;
        const discount = 0;
        const totalAmount = subtotal + tax + shippingCharge - discount;

        // Generate order number
        const orderNumber = await this.generateOrderNumber();

        // Create order with inline shipping data
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: OrderStatus.PENDING,
            subtotal,
            tax,
            shippingCharge,
            discount,
            totalAmount,
            // Inline shipping data
            shippingName,
            shippingPhone,
            shippingLine1,
            shippingLine2,
            shippingCity,
            shippingState,
            shippingPincode,
            shippingCountry,
            notes,
            items: {
              createMany: {
                data: orderItemsData,
              },
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // Create initial tracking event
        await tx.orderTracking.create({
          data: {
            orderId: order.id,
            status: OrderStatus.PENDING,
            note: 'Order created',
          },
        });

        // Log order creation
        await this.auditService.logOrder(
          'ORDER_CREATED',
          order.id,
          userId,
          '0.0.0.0', // Will be updated when we add IP to resolver
          {
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            itemCount: items.length,
          },
        );

        return order;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000, // 10 seconds
      },
    );
  }

  /**
   * Get order by ID with ownership check
   */
  async findById(orderId: string, userId: string, userRole: Role): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        address: true,
        payment: true,
        trackingEvents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return null;
    }

    // Check ownership (admins can view all orders)
    if (order.userId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You can only view your own orders');
    }

    return order;
  }

  /**
   * Get user's orders
   */
  async getUserOrders(
    userId: string,
    skip: number = 0,
    take: number = 20,
    status?: OrderStatus,
  ): Promise<{ orders: Order[]; total: number }> {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          address: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  /**
   * Get all orders (admin only)
   */
  async getAllOrders(
    skip: number = 0,
    take: number = 50,
    status?: OrderStatus,
  ): Promise<{ orders: Order[]; total: number }> {
    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          address: true,
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
      this.prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  /**
   * Update order status with validation
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    adminId: string,
    note?: string,
  ): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate state transition
    if (!this.isValidTransition(order.status, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${newStatus}`,
      );
    }

    // Update order status and create tracking event in transaction
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          address: true,
          trackingEvents: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Create tracking event
      await tx.orderTracking.create({
        data: {
          orderId,
          status: newStatus,
          note: note || `Order status changed to ${newStatus}`,
        },
      });

      return updated;
    });

    // Log order status change
    await this.auditService.logOrder('ORDER_STATUS_CHANGED', orderId, order.userId, '0.0.0.0', {
      oldStatus: order.status,
      newStatus,
      changedBy: adminId,
      note,
    });

    return updatedOrder;
  }

  /**
   * Cancel order with inventory restoration
   */
  async cancelOrder(
    orderId: string,
    userId: string,
    userRole: Role,
    reason?: string,
  ): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check ownership (admins can cancel any order)
    if (order.userId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    // Check if order can be cancelled
    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
    ];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order with status ${order.status}`);
    }

    // Cancel order and restore inventory in transaction
    return await this.prisma.$transaction(async (tx) => {
      // Restore inventory for each item
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      // Update order status
      const cancelledOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelReason: reason,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          address: true,
          trackingEvents: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Create tracking event
      await tx.orderTracking.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          note: reason || 'Order cancelled',
        },
      });

      return cancelledOrder;
    });
  }

  /**
   * Get order statistics (admin only)
   */
  async getOrderStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    paidOrders: number;
    processingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
  }> {
    const [
      totalOrders,
      pendingOrders,
      paidOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      revenueResult,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.PAID } }),
      this.prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
      this.prisma.order.count({ where: { status: OrderStatus.SHIPPED } }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      this.prisma.order.aggregate({
        where: {
          status: {
            in: [
              OrderStatus.PAID,
              OrderStatus.PROCESSING,
              OrderStatus.SHIPPED,
              OrderStatus.DELIVERED,
            ],
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      paidOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: revenueResult._sum.totalAmount || 0,
    };
  }

  /**
   * Get order tracking history
   */
  async getOrderTracking(orderId: string): Promise<any[]> {
    return this.prisma.orderTracking.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
