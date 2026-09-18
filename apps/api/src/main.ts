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
import { rateLimitMiddleware } from './common/rate-limit.middleware.js';

import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown hooks for Prisma, Redis, and queues
  app.enableShutdownHooks();

  if (process.env.NODE_ENV === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  // Request payload bounds
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Security response headers
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Dual health endpoint support: allow /health/* to resolve cleanly alongside /api/v1/health/*
  app.use((req: any, _res: any, next: any) => {
    if (req.url && (req.url === '/health/live' || req.url === '/health/ready' || req.url === '/health/dependencies' || req.url.startsWith('/health/'))) {
      req.url = `/api/v1${req.url}`;
    }
    next();
  });

  app.use(rateLimitMiddleware);

  // Configure CORS to authorize frontend client with credentials
  const allowedOrigin = process.env.FRONTEND_URL || process.env.WEB_PUBLIC_URL || 'http://localhost:3000';
  app.enableCors({
    origin: allowedOrigin,
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
