import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@prisma/client';

// Register enum for GraphQL
registerEnumType(OrderStatus, {
  name: 'OrderStatus',
  description: 'Order status enum',
});

@InputType()
export class UpdateOrderStatusInput {
  @Field(() => OrderStatus)
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string;
}
