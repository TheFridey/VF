/**
 * E2E test setup — creates a fully bootstrapped NestJS app against a real
 * test database (DATABASE_URL_TEST env var, falls back to DATABASE_URL).
 *
 * Each test file calls createTestApp() and destroys it in afterAll().
 * Tests are isolated by wrapping mutations in transactions that are rolled
 * back, or by using unique email addresses per test run (via runId).
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';

export interface TestApp {
  app: INestApplication;
  http: ReturnType<typeof request>;
  runId: string;
}

export async function createTestApp(): Promise<TestApp> {
  // Use a short random suffix so parallel test runs don't collide on emails
  const runId = Math.random().toString(36).slice(2, 8);

  // Override DATABASE_URL with test database if provided
  if (process.env.DATABASE_URL_TEST) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  }

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.use(cookieParser(process.env.COOKIE_SECRET || 'test-secret'));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api/v1');

  await app.init();

  const http = request(app.getHttpServer());

  return { app, http, runId };
}

/**
 * Helper: register + login in one call, returns cookies + user
 */
export async function registerAndLogin(
  http: ReturnType<typeof request>,
  email: string,
  password = 'Test@Passphrase99!',
) {
  // Register
  await http
    .post('/api/v1/auth/register')
    .send({ email, password })
    .expect((res: import('supertest').Response) => {
      if (res.status !== 201 && res.status !== 200 && res.status !== 409) {
        throw new Error(`Register failed: ${res.status} ${JSON.stringify(res.body)}`);
      }
    });

  // Login — capture cookies
  const loginRes = await http
    .post('/api/v1/auth/login')
    .send({ email, password });

  const cookies = loginRes.headers['set-cookie'] as unknown as string[] | undefined;
  const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : '';

  return {
    user: loginRes.body?.data?.user ?? loginRes.body?.user,
    status: loginRes.status,
    cookieHeader,
    cookies,
  };
}
