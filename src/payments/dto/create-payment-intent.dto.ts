import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class CreatePaymentIntentDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;
}
