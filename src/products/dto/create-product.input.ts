import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsInt,
  Min,
  IsArray,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreateProductInput {
  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  slug: string;

  @Field()
  @IsString()
  @MinLength(10)
  description: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  price: number; // in paise

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  mrp?: number; // in paise

  @Field(() => Int)
  @IsInt()
  @Min(0)
  stock: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  lowStockThreshold?: number;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
