import { InputType, Field, ID, Int } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class OrderItemInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  productId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  quantity: number;
}

@InputType()
export class CreateOrderInput {
  @Field(() => [OrderItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];

  // Inline shipping address fields
  @Field()
  @IsNotEmpty()
  @IsString()
  shippingName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  shippingPhone: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  shippingLine1: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  shippingLine2?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  shippingCity: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  shippingState: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  shippingPincode: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  shippingCountry: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
