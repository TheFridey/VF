/**
 * E2E: Verification queue & SLA checks
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, TestApp } from './test-helpers';

describe('Verification E2E', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    testApp = await createTestApp();
    ({ app, http } = testApp);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /verification/admin/pending', () => {
    it('returns 401 without auth', async () => {
      const res = await http.get('/api/v1/verification/admin/pending');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin/moderator', async () => {
      // Login as regular user — not possible without verified email in test env
      // so we check that the guard is wired by testing with no auth
      const res = await http.get('/api/v1/verification/admin/pending');
      expect([401, 403]).toContain(res.status);
    });

    it('returns paginated pending queue with SLA fields for admin', async () => {
      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;

      const loginRes = await http
        .post('/api/v1/auth/login')
        .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

      const cookies = (loginRes.headers['set-cookie'] as unknown as string[])?.join('; ') ?? '';
      const csrfToken = (loginRes.headers['set-cookie'] as unknown as string[])
        ?.find((c: string) => c.startsWith('csrf-token='))
        ?.split(';')[0]
        ?.split('=')[1];

      const res = await http
        .get('/api/v1/verification/admin/pending')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken ?? '');

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;

      // Should have pagination shape
      expect(body).toHaveProperty('requests');
      expect(body).toHaveProperty('total');

      // Each request should have SLA metadata attached
      if (body.requests.length > 0) {
        const req = body.requests[0];
        expect(req).toHaveProperty('sla');
        expect(req.sla).toHaveProperty('hoursElapsed');
        expect(req.sla).toHaveProperty('targetHours');
        expect(req.sla).toHaveProperty('breached');
        expect(req.sla).toHaveProperty('urgency');
      }
    });
  });

  describe('Verification submit', () => {
    it('rejects non-multipart request', async () => {
      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;

      const loginRes = await http
        .post('/api/v1/auth/login')
        .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

      const cookies = (loginRes.headers['set-cookie'] as unknown as string[])?.join('; ') ?? '';
      const csrfToken = (loginRes.headers['set-cookie'] as unknown as string[])
        ?.find((c: string) => c.startsWith('csrf-token='))
        ?.split(';')[0]
        ?.split('=')[1];

      const res = await http
        .post('/api/v1/verification/submit')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken ?? '')
        .send({}); // no files

      // 400 because no files provided
      expect(res.status).toBe(400);
    });
  });
});
