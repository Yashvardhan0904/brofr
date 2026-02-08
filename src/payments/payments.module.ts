import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsResolver } from './payments.resolver';
import { StripeService } from './stripe.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, OrdersModule, AuditModule],
  providers: [PaymentsService, PaymentsResolver, StripeService],
  controllers: [PaymentsController],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}
