import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrdersResponse } from './entities/orders-response.entity';
import { OrderStats } from './entities/order-stats.entity';
import { OrderTracking } from './entities/order-tracking.entity';
import { CreateOrderInput } from './dto/create-order.input';
import { UpdateOrderStatusInput } from './dto/update-order-status.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserPayload } from '../common/types/user-payload.type';
import { Role, OrderStatus } from '@prisma/client';

@Resolver(() => Order)
export class OrdersResolver {
  constructor(private ordersService: OrdersService) {}

  /**
   * Create order (authenticated)
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Order, { description: 'Create order' })
  async createOrder(
    @CurrentUser() user: UserPayload,
    @Args('input') input: CreateOrderInput,
  ): Promise<Order> {
    return this.ordersService.createOrder(user.userId, input);
  }

  /**
   * Get order by ID (authenticated, ownership)
   */
  @UseGuards(JwtAuthGuard)
  @Query(() => Order, {
    nullable: true,
    description: 'Get order by ID',
  })
  async order(
    @CurrentUser() user: UserPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Order | null> {
    return this.ordersService.findById(id, user.userId, user.role);
  }

  /**
   * Get user's orders (authenticated)
   */
  @UseGuards(JwtAuthGuard)
  @Query(() => OrdersResponse, { description: 'Get user orders' })
  async myOrders(
    @CurrentUser() user: UserPayload,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number,
    @Args('status', { type: () => OrderStatus, nullable: true })
    status?: OrderStatus,
  ): Promise<OrdersResponse> {
    const { orders, total } = await this.ordersService.getUserOrders(
      user.userId,
      skip,
      take,
      status,
    );

    return {
      orders,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Get all orders (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Query(() => OrdersResponse, { description: 'Get all orders (admin only)' })
  async allOrders(
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 50 })
    take: number,
    @Args('status', { type: () => OrderStatus, nullable: true })
    status?: OrderStatus,
  ): Promise<OrdersResponse> {
    const { orders, total } = await this.ordersService.getAllOrders(skip, take, status);

    return {
      orders,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Update order status (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Mutation(() => Order, { description: 'Update order status (admin only)' })
  async updateOrderStatus(
    @CurrentUser() admin: UserPayload,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateOrderStatusInput,
  ): Promise<Order> {
    return this.ordersService.updateOrderStatus(id, input.status, admin.id, input.note);
  }

  /**
   * Cancel order (authenticated, ownership or admin)
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Order, { description: 'Cancel order' })
  async cancelOrder(
    @CurrentUser() user: UserPayload,
    @Args('id', { type: () => ID }) id: string,
    @Args('reason', { nullable: true }) reason?: string,
  ): Promise<Order> {
    return this.ordersService.cancelOrder(id, user.userId, user.role, reason);
  }

  /**
   * Get order statistics (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Query(() => OrderStats, {
    description: 'Get order statistics (admin only)',
  })
  async orderStats(): Promise<OrderStats> {
    return this.ordersService.getOrderStats();
  }

  /**
   * Get order tracking history
   */
  @UseGuards(JwtAuthGuard)
  @Query(() => [OrderTracking], { description: 'Get order tracking history' })
  async orderTracking(
    @CurrentUser() user: UserPayload,
    @Args('orderId', { type: () => ID }) orderId: string,
  ): Promise<OrderTracking[]> {
    // Verify ownership first
    await this.ordersService.findById(orderId, user.userId, user.role);
    return this.ordersService.getOrderTracking(orderId);
  }
}
