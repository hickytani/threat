import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_IN_MEMORY_QUEUE_FALLBACK === 'true') {
  delete process.env.REDIS_URL;
}

import { validateEnv } from './common/env.validation.js';
validateEnv();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS to authorize Next.js client with credentials
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Parse Cookie header and populate req.cookies
  app.use(cookieParser());

  // Versioned routing endpoints
  app.setGlobalPrefix('api/v1');

  // Request payload validation pipeline
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`ThreatSync OS REST API is running on: http://localhost:${port}/api/v1`);
}
bootstrap();
