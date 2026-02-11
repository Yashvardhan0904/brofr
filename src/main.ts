import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  // Create application with logging configuration
  const app = await NestFactory.create(AppModule, {
    logger: isProduction ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Cookie parser
  app.use(cookieParser());

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP - it can block GraphQL requests
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      hsts: isProduction
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,
    }),
  );

  // CORS - allow all origins (API uses Bearer token auth, not cookies, so this is safe)
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400, // 24 hours
  });

  // Global validation pipe with strict settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: isProduction, // Hide detailed validation errors in production
    }),
  );

  // Graceful shutdown handling
  app.enableShutdownHooks();

  // Handle shutdown signals
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM signal received: closing HTTP server');
    await app.close();
    logger.log('HTTP server closed');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT signal received: closing HTTP server');
    await app.close();
    logger.log('HTTP server closed');
    process.exit(0);
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 GraphQL API running on http://localhost:${port}/graphql`);
  logger.log(`🔒 Security: Helmet, CORS (open), Rate Limiting enabled`);
  logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

  if (!isProduction) {
    logger.log(`🎮 GraphQL Playground: http://localhost:${port}/graphql`);
  } else {
    logger.log(`🔐 GraphQL Playground: DISABLED (production mode)`);
    logger.log(`🔐 GraphQL Introspection: DISABLED (production mode)`);
  }
}

bootstrap();
