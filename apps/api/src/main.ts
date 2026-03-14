// ── libuv thread pool ────────────────────────────────────────────────────────
// Must be set BEFORE any require/import that uses the thread pool.
// Default is 4. argon2 with parallelism=4 fills all 4 slots, starving other
// async I/O (DNS, file ops) and compounding connection-pool hold times.
// 16 gives argon2 its 4 threads and leaves 12 for everything else.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE ?? '16';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for Stripe webhook signature validation
  });

  // ── Security headers ────────────────────────────────────────────────────────
  // CSP note: the NestJS API only serves JSON responses and webhooks — it does
  // NOT serve HTML pages.  The strict CSP with nonce-based scripts is applied
  // by the Next.js middleware on the frontend.  The API CSP here is set to a
  // safe default that does not permit scripts/iframes at all.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc:    ["'none'"],
          scriptSrc:     ["'none'"],
          styleSrc:      ["'none'"],
          imgSrc:        ["'none'"],
          connectSrc:    ["'self'"],
          frameAncestors: ["'none'"],
          formAction:    ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false, // Allow WebRTC (coturn)
    }),
  );

  // ── Cookie parser ────────────────────────────────────────────────────────────
  app.use(cookieParser(process.env.COOKIE_SECRET));

  // ── CSRF protection ──────────────────────────────────────────────────────────
  // Must come after cookieParser.
  // Exempt: safe methods, Stripe webhooks, email-link endpoints, pre-auth POSTs.
  // See: apps/api/src/common/middleware/csrf.middleware.ts for full rationale.
  const csrf = new CsrfMiddleware();
  app.use(
    (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) =>
      csrf.use(req, res, next),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────────
  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3002',
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
  ].filter((o): o is string => !!o);

  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count'],
  });

  // ── Global validation pipe ───────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // ── API prefix ───────────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger ──────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('VeteranFinder API')
      .setDescription('API for VeteranFinder — veteran reconnection and BIA community platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Response envelope ────────────────────────────────────────────────────────
  // Wraps every successful response in { data: T, timestamp: string }.
  // Errors use { statusCode, message } via GlobalExceptionFilter.
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── Exception filter ─────────────────────────────────────────────────────────
  // Standardises error responses, prevents stack trace leakage in production.
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[Bootstrap] VeteranFinder API running on port ${port}`);
  console.log(`[Bootstrap] Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
