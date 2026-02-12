import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { SocialModule } from './social/social.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { UploadModule } from './upload/upload.module';
import { DataLoaderModule } from './common/dataloaders/dataloader.module';
import { DataLoaderFactory } from './common/dataloaders/dataloader.factory';
import { ComplexityPlugin } from './common/plugins/complexity.plugin';
import { GraphQLExceptionFilter } from './common/filters/graphql-exception.filter';

@Module({
  imports: [
    // GraphQL Configuration
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        playground: process.env.NODE_ENV !== 'production',
        introspection: true,
        context: ({ req, res }: { req: any; res: any }) => {
          console.log('=== CONTEXT CREATION ===');
          console.log('req exists:', !!req);
          console.log('res exists:', !!res);
          
          // Create DataLoaders for each request
          const dataLoaderFactory = new DataLoaderFactory(prisma);
          const loaders = dataLoaderFactory.createLoaders();

          return { req, res, loaders };
        },
        formatError: (error) => {
          // Additional error formatting if needed
          return error;
        },
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),

    // Database
    PrismaModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    ProductsModule,
    SocialModule,
    OrdersModule,
    PaymentsModule,
    AuditModule,
    HealthModule,
    UploadModule,
    DataLoaderModule,
  ],
  providers: [
    // Global rate limiting guard - TEMPORARILY DISABLED FOR DEBUGGING
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: GraphQLExceptionFilter,
    },
    // Query complexity plugin - TEMPORARILY DISABLED
    // ComplexityPlugin,
  ],
})
export class AppModule {}
