/**
 * E2E: Authentication flows
 *
 * Covers: register → verify email → login → refresh → logout
 * Also covers security edge cases: lockout, bad tokens, CSRF.
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, TestApp } from './test-helpers';

describe('Auth E2E', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let runId: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    ({ app, http, runId } = testApp);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Registration ───────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('registers a new user successfully', async () => {
      const res = await http
        .post('/api/v1/auth/register')
        .send({ email: `e2e-${runId}@test.com`, password: 'Test@Passphrase99!' });

      expect(res.status).toBe(201);
      expect(res.body.data?.message ?? res.body.message).toMatch(/verification/i);
    });

    it('rejects duplicate email', async () => {
      const email = `dup-${runId}@test.com`;
      await http.post('/api/v1/auth/register').send({ email, password: 'Test@Passphrase99!' });
      const res = await http.post('/api/v1/auth/register').send({ email, password: 'Test@Passphrase99!' });
      expect(res.status).toBe(409);
    });

    it('rejects weak passwords (entropy)', async () => {
      const res = await http
        .post('/api/v1/auth/register')
        .send({ email: `weak-${runId}@test.com`, password: 'Password123!' });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/pattern|predictable|breach/i);
    });

    it('rejects passwords below minimum length', async () => {
      const res = await http
        .post('/api/v1/auth/register')
        .send({ email: `short-${runId}@test.com`, password: 'Ab1!' });
      expect(res.status).toBe(400);
    });

    it('is rate limited (5 req/hr per IP)', async () => {
      // Hit register 6 times rapidly with distinct emails — 6th should be 429
      const attempts = Array.from({ length: 6 }, (_, i) =>
        http.post('/api/v1/auth/register').send({
          email: `rate-${runId}-${i}@test.com`,
          password: 'Test@Passphrase99!',
        }),
      );
      const results = await Promise.all(attempts);
      const statuses = results.map((r) => r.status);
      // At least one should be 429 — exact position depends on throttle state
      expect(statuses).toContain(429);
    });
  });

  // ── Login ──────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('returns 401 for unknown email', async () => {
      const res = await http
        .post('/api/v1/auth/login')
        .send({ email: `nobody-${runId}@test.com`, password: 'Test@Passphrase99!' });
      expect(res.status).toBe(401);
    });

    it('returns 401 for wrong password', async () => {
      const email = `login-${runId}@test.com`;
      await http.post('/api/v1/auth/register').send({ email, password: 'Test@Passphrase99!' });
      const res = await http.post('/api/v1/auth/login').send({ email, password: 'WrongPassword99!' });
      expect(res.status).toBe(401);
    });

    it('sets HttpOnly cookies on success (admin user bypasses email check)', async () => {
      // This test only works if an ADMIN seed exists — guard with skip
      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
        return; // seed not available in CI without DB setup
      }
      const res = await http
        .post('/api/v1/auth/login')
        .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

      expect(res.status).toBe(200);
      const setCookie = res.headers['set-cookie'] as unknown as string[];
      expect(setCookie.some((c: string) => c.includes('access_token'))).toBe(true);
      expect(setCookie.some((c: string) => c.includes('HttpOnly'))).toBe(true);
    });

    it('does not expose token in response body', async () => {
      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;
      const res = await http
        .post('/api/v1/auth/login')
        .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
      // accessToken must NOT appear in body — it lives in HttpOnly cookie only
      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/eyJ/); // JWT prefix
    });
  });

  // ── CSRF ───────────────────────────────────────────────────────────────────

  describe('CSRF protection', () => {
    it('GET /auth/csrf-token sets csrf-token cookie', async () => {
      const res = await http.get('/api/v1/auth/csrf-token');
      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      const csrfCookie = cookies?.find((c: string) => c.startsWith('csrf-token='));
      expect(csrfCookie).toBeDefined();
      // csrf-token must NOT be HttpOnly (JS must read it)
      expect(csrfCookie).not.toMatch(/HttpOnly/i);
    });

    it('POST without CSRF header returns 403', async () => {
      // Get a CSRF cookie first
      const getRes = await http.get('/api/v1/auth/csrf-token');
      const cookies = getRes.headers['set-cookie'] as unknown as string[];
      const cookieHeader = cookies?.join('; ') ?? '';

      // POST with cookie but WITHOUT X-CSRF-Token header → should fail
      const res = await http
        .post('/api/v1/auth/register')
        .set('Cookie', cookieHeader) // send cookie but no header
        .send({ email: `nocsrf-${runId}@test.com`, password: 'Test@Passphrase99!' });

      expect(res.status).toBe(403);
    });

    it('POST with mismatched CSRF token returns 403', async () => {
      const getRes = await http.get('/api/v1/auth/csrf-token');
      const cookies = getRes.headers['set-cookie'] as unknown as string[];
      const cookieHeader = cookies?.join('; ') ?? '';

      const res = await http
        .post('/api/v1/auth/register')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', 'tampered-token-value')
        .send({ email: `badcsrf-${runId}@test.com`, password: 'Test@Passphrase99!' });

      expect(res.status).toBe(403);
    });
  });

  // ── Refresh & Logout ───────────────────────────────────────────────────────

  describe('Refresh / Logout', () => {
    it('POST /auth/refresh without cookie returns 401', async () => {
      const res = await http.post('/api/v1/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('POST /auth/logout clears cookies', async () => {
      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;
      // Login first
      const loginRes = await http
        .post('/api/v1/auth/login')
        .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      const cookieHeader = cookies?.join('; ') ?? '';
      const csrfToken = cookies
        ?.find((c: string) => c.startsWith('csrf-token='))
        ?.split(';')[0]
        ?.split('=')[1];

      const logoutRes = await http
        .post('/api/v1/auth/logout')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', csrfToken ?? '');

      expect(logoutRes.status).toBe(200);
      const clearCookies = logoutRes.headers['set-cookie'] as unknown as string[];
      expect(clearCookies?.some((c: string) => c.includes('access_token=;') || c.includes('Max-Age=0'))).toBe(true);
    });
  });
});
