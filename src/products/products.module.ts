import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsResolver } from './products.resolver';
import { CategoriesService } from './categories.service';
import { CategoriesResolver } from './categories.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ProductsService, ProductsResolver, CategoriesService, CategoriesResolver],
  exports: [ProductsService, CategoriesService],
})
export class ProductsModule {}
