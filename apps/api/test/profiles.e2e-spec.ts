/**
 * E2E: Profiles & Brothers in Arms search
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createStaffUser, createTestApp, getCookieValue, loginUser, TestApp } from './test-helpers';

describe('Profiles & Brothers E2E', () => {
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

  describe('GET /profiles/me', () => {
    it('returns 401 without auth', async () => {
      const res = await http.get('/api/v1/profiles/me');
      expect(res.status).toBe(401);
    });

    it('returns profile for authenticated user', async () => {
      const email = `profiles-admin-${runId}@test.com`;
      const password = 'AdminPassphrase99!';

      await createStaffUser(testApp.prisma, testApp.passwordSecurity, {
        email,
        password,
        role: 'ADMIN',
      });

      const loginRes = await loginUser(http, email, password);
      expect(loginRes.status).toBe(200);
      const accessToken = getCookieValue(loginRes, 'access_token');
      expect(accessToken).toBeTruthy();

      if (!accessToken) {
        throw new Error('Expected access token cookie');
      }

      const res = await http
        .get('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data ?? res.body).toBeDefined();
    });
  });

  describe('GET /brothers/search', () => {
    it('returns 401 without auth', async () => {
      const res = await http.get('/api/v1/brothers/search');
      expect(res.status).toBe(401);
    });

    it('blocks unverified veterans from authenticated search access', async () => {
      const email = `unverified-${runId}@test.com`;
      await http.post('/api/v1/auth/register').send({ email, password: 'Test@Passphrase99!' });

      const loginRes = await http.post('/api/v1/auth/login').send({ email, password: 'Test@Passphrase99!' });
      expect(loginRes.status).toBe(401);
    });
  });

  describe('Profile caching', () => {
    it('two rapid GET requests return the same profile payload', async () => {
      const email = `cache-admin-${runId}@test.com`;
      const password = 'AdminPassphrase99!';

      await createStaffUser(testApp.prisma, testApp.passwordSecurity, {
        email,
        password,
        role: 'ADMIN',
      });

      const loginRes = await loginUser(http, email, password);
      expect(loginRes.status).toBe(200);
      const accessToken = getCookieValue(loginRes, 'access_token');
      expect(accessToken).toBeTruthy();

      if (!accessToken) {
        throw new Error('Expected access token cookie');
      }

      const [res1, res2] = await Promise.all([
        http.get('/api/v1/profiles/me').set('Authorization', `Bearer ${accessToken}`),
        http.get('/api/v1/profiles/me').set('Authorization', `Bearer ${accessToken}`),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const profile1 = res1.body.data ?? res1.body;
      const profile2 = res2.body.data ?? res2.body;
      expect(profile1.id).toBe(profile2.id);
    });
  });
});
