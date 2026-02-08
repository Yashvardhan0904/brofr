import { IsNotEmpty, IsString, IsOptional, IsInt, IsEnum } from 'class-validator';

export class WebhookPayloadDto {
  @IsNotEmpty()
  @IsString()
  event: string; // e.g., 'payment.success', 'payment.failed'

  @IsNotEmpty()
  @IsString()
  providerOrderId: string;

  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsInt()
  amount?: number;

  @IsOptional()
  @IsString()
  status?: string; // 'SUCCESS', 'FAILED', etc.

  @IsOptional()
  @IsString()
  paymentMethod?: string; // 'card', 'upi', 'netbanking', etc.

  @IsOptional()
  @IsString()
  failureReason?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
