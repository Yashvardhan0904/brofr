import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { OrderStatus } from '@prisma/client';
import { User } from '../../users/entities/user.entity';
import { Address } from './address.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';
import { OrderTracking } from './order-tracking.entity';

// Register enum for GraphQL
registerEnumType(OrderStatus, {
  name: 'OrderStatus',
  description: 'Order status enum',
});

@ObjectType()
export class Order {
  @Field(() => ID)
  id: string;

  @Field()
  orderNumber: string;

  @Field(() => ID)
  userId: string;

  @Field(() => OrderStatus)
  status: OrderStatus;

  @Field(() => Int)
  subtotal: number;

  @Field(() => Int)
  tax: number;

  @Field(() => Int)
  shippingCharge: number;

  @Field(() => Int)
  discount: number;

  @Field(() => Int)
  totalAmount: number;

  @Field(() => ID, { nullable: true })
  addressId?: string | null;

  @Field()
  shippingName: string;

  @Field()
  shippingPhone: string;

  @Field()
  shippingLine1: string;

  @Field(() => String, { nullable: true })
  shippingLine2?: string | null;

  @Field()
  shippingCity: string;

  @Field()
  shippingState: string;

  @Field()
  shippingPincode: string;

  @Field()
  shippingCountry: string;

  @Field(() => String, { nullable: true })
  notes?: string | null;

  @Field(() => String, { nullable: true })
  cancelReason?: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => Address, { nullable: true })
  address?: Address;

  @Field(() => [OrderItem], { nullable: true })
  items?: OrderItem[];

  @Field(() => Payment, { nullable: true })
  payment?: Payment;

  @Field(() => [OrderTracking], { nullable: true })
  trackingEvents?: OrderTracking[];
}
