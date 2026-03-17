import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { v2 as cloudinary } from 'cloudinary';
import * as cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { CsrfMiddleware } from '../src/common/middleware/csrf.middleware';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';
import { PasswordSecurityService } from '../src/auth/password-security.service';
import { RedisService } from '../src/common/redis/redis.service';
import { CloudinaryService } from '../src/uploads/cloudinary.service';
import { UserStatus } from '@prisma/client';

class InMemoryRedisService {
  private readonly store = new Map<string, { value: string; expiresAt?: number }>();

  public readonly client = {
    get: async (key: string) => this.get(key),
    setex: async (key: string, ttlSeconds: number, value: string) => this.set(key, value, ttlSeconds),
    exists: async (key: string) => (await this.exists(key) ? 1 : 0),
    del: async (...keys: string[]) => {
      keys.forEach((key) => this.store.delete(key));
      return keys.length;
    },
    scan: async (_cursor: string, _matchLabel: string, pattern: string) => {
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      const keys = [...this.store.keys()].filter((key) => regex.test(key));
      return ['0', keys] as [string, string[]];
    },
    multi: () => {
      let pendingKey = '';
      return {
        incr: (key: string) => {
          pendingKey = key;
          return this.client.multi();
        },
        expire: () => this.client.multi(),
        exec: async () => {
          const nextCount = (await this.getRateLimit(pendingKey)) + 1;
          await this.set(pendingKey, String(nextCount), 60);
          return [[null, nextCount], [null, 1]];
        },
      };
    },
  };

  private prune(key: string) {
    const entry = this.store.get(key);
    if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async get(key: string): Promise<string | null> {
    return this.prune(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.prune(key) != null;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async setSession(userId: string, sessionData: object, ttlSeconds: number): Promise<void> {
    await this.set(`session:${userId}`, JSON.stringify(sessionData), ttlSeconds);
  }

  async getSession(userId: string): Promise<object | null> {
    const data = await this.get(`session:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(userId: string): Promise<void> {
    await this.del(`session:${userId}`);
  }

  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    const current = (await this.getRateLimit(key)) + 1;
    await this.set(key, String(current), windowSeconds);
    return current;
  }

  async getRateLimit(key: string): Promise<number> {
    const value = await this.get(key);
    return value ? Number.parseInt(value, 10) : 0;
  }

  async cacheSet<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    await this.set(`cache:${key}`, JSON.stringify(data), ttlSeconds);
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    const data = await this.get(`cache:${key}`);
    return data ? (JSON.parse(data) as T) : null;
  }

  async cacheInvalidate(pattern: string): Promise<void> {
    const regex = new RegExp(`^cache:${pattern.replace(/\*/g, '.*')}$`);
    [...this.store.keys()].forEach((key) => {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    });
  }

  async incrementLoginAttempts(email: string): Promise<number> {
    return this.incrementRateLimit(`login_attempts:${email}`, 900);
  }

  async getLoginAttempts(email: string): Promise<number> {
    return this.getRateLimit(`login_attempts:${email}`);
  }

  async clearLoginAttempts(email: string): Promise<void> {
    await this.del(`login_attempts:${email}`);
  }

  async isAccountLocked(email: string): Promise<boolean> {
    return (await this.getLoginAttempts(email)) >= 5;
  }

  async incrementUserRate(userId: string, windowKey: string, windowSeconds: number): Promise<number> {
    return this.incrementRateLimit(`user_rate:${userId}:${windowKey}`, windowSeconds);
  }

  async getUserRate(userId: string, windowKey: string): Promise<number> {
    return this.getRateLimit(`user_rate:${userId}:${windowKey}`);
  }

  async setSlaAlertSent(requestId: string): Promise<void> {
    await this.set(`sla_alert:${requestId}`, '1', 7 * 24 * 3600);
  }

  async isSlaAlertSent(requestId: string): Promise<boolean> {
    return this.exists(`sla_alert:${requestId}`);
  }

  async scanKeys(pattern: string): Promise<string[]> {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return [...this.store.keys()].filter((key) => regex.test(key));
  }

  async keys(pattern: string): Promise<string[]> {
    return this.scanKeys(pattern);
  }
}

type SentVerificationEmail = { to: string; token: string };

class TestEmailService {
  public readonly verificationEmails: SentVerificationEmail[] = [];

  async sendEmailVerification(to: string, token: string): Promise<void> {
    this.verificationEmails.push({ to, token });
  }

  async sendPasswordReset(): Promise<void> {}
  async sendVerificationApproved(): Promise<void> {}
  async sendVerificationRejected(): Promise<void> {}
  async sendNewConnectionNotification(): Promise<void> {}
  async sendSlaBreachAlert(): Promise<void> {}
}

const cloudinaryUploadSpy = jest.spyOn(cloudinary.uploader, 'upload_stream');
const cloudinaryDeleteSpy = jest.spyOn(cloudinary.api, 'delete_resources');

export interface TestApp {
  app: INestApplication;
  http: ReturnType<typeof request>;
  runId: string;
  prisma: PrismaService;
  passwordSecurity: PasswordSecurityService;
  emailService: TestEmailService;
  redis: InMemoryRedisService;
}

function ensureTestEnv() {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://veteranfinder:veteranfinder@localhost:5432/veteranfinder?connection_limit=10&pool_timeout=20&connect_timeout=10';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-characters';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-at-least-32-char';
  process.env.COOKIE_SECRET = process.env.COOKIE_SECRET || 'test-cookie-secret-at-least-32-char';
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
  process.env.PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || 'test-password-pepper-at-least-32ch';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
  process.env.ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3002';
}

function applyAppMiddleware(app: INestApplication) {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser(process.env.COOKIE_SECRET || 'test-cookie-secret'));

  const csrf = new CsrfMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => csrf.use(req, res, next));

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count'],
  });

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
}

export async function createTestApp(): Promise<TestApp> {
  ensureTestEnv();

  const runId = Math.random().toString(36).slice(2, 8);
  const redis = new InMemoryRedisService();
  const emailService = new TestEmailService();

  cloudinaryUploadSpy.mockImplementation(((options: Record<string, unknown>, callback: (...args: any[]) => void) => {
    const publicId = String(options.public_id ?? `vf-test-${Date.now()}`);
    return {
      end: () => callback(undefined, {
        public_id: publicId,
        secure_url: `https://cloudinary.test/${String(options.resource_type ?? 'image')}/${publicId}`,
        resource_type: options.resource_type ?? 'image',
      }),
    };
  }) as any);
  cloudinaryDeleteSpy.mockResolvedValue({ deleted: {} } as any);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailService)
    .useValue(emailService)
    .overrideProvider(RedisService)
    .useValue(redis)
    .overrideProvider(CloudinaryService)
    .useValue({
      getAuthenticatedUrl: (publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image') =>
        `https://cloudinary.test/${resourceType}/${publicId}`,
    })
    .compile();

  const app = moduleFixture.createNestApplication();
  applyAppMiddleware(app);
  await app.init();

  const passwordSecurity = app.get(PasswordSecurityService);
  jest.spyOn(passwordSecurity, 'isBreachedPassword').mockResolvedValue(false);

  const prisma = app.get(PrismaService);
  const http = request(app.getHttpServer());

  return { app, http, runId, prisma, passwordSecurity, emailService, redis };
}

export async function getCsrfToken(agent: any): Promise<string> {
  const res = await agent.get('/api/v1/auth/csrf-token');
  const body = res.body?.data ?? res.body;
  return body.csrfToken;
}

export async function registerUser(
  http: any,
  email: string,
  password = 'CorrectHorseBatteryStaple99!',
) {
  return http.post('/api/v1/auth/register').send({ email, password, userType: 'veteran' });
}

export async function verifyUserEmail(
  prisma: PrismaService,
  http: any,
  email: string,
) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { emailVerificationToken: true },
  });

  if (!user?.emailVerificationToken) {
    throw new Error(`No verification token found for ${email}`);
  }

  return http.post('/api/v1/auth/verify-email').send({ token: user.emailVerificationToken });
}

export async function loginUser(
  http: any,
  email: string,
  password = 'CorrectHorseBatteryStaple99!',
) {
  return http.post('/api/v1/auth/login').send({ email, password });
}

export async function createStaffUser(
  prisma: PrismaService,
  passwordSecurity: PasswordSecurityService,
  {
    email,
    password,
    role,
  }: {
    email: string;
    password: string;
    role: 'ADMIN' | 'MODERATOR';
  },
) {
  const passwordHash = await passwordSecurity.hash(password);

  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      passwordHash,
      emailVerified: true,
      role,
      status: UserStatus.ACTIVE,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      emailVerified: true,
      role,
      status: UserStatus.ACTIVE,
    },
  });
}

export function getCookieHeader(response: { headers: Record<string, unknown> }) {
  const cookies = (response.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
}

export function getCookieValue(
  response: { headers: Record<string, unknown> },
  cookieName: string,
) {
  const cookies = (response.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  const match = cookies.find((cookie) => cookie.startsWith(`${cookieName}=`));
  return match?.split(';')[0]?.split('=')[1] ?? null;
}
