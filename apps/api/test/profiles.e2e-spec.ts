/**
 * E2E: Profiles & Brothers in Arms search
 */

import { INestApplication } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
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

  async function createVerifiedVeteran(email: string, password: string) {
    const passwordHash = await testApp.passwordSecurity.hash(password);

    return testApp.prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {
        passwordHash,
        emailVerified: true,
        role: UserRole.VETERAN_VERIFIED,
        status: UserStatus.ACTIVE,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        profile: {
          upsert: {
            update: {},
            create: {},
          },
        },
      },
      create: {
        email: email.toLowerCase(),
        passwordHash,
        emailVerified: true,
        role: UserRole.VETERAN_VERIFIED,
        status: UserStatus.ACTIVE,
        profile: {
          create: {},
        },
      },
    });
  }

  function getProfileMutationHeaders(loginResponse: { headers: Record<string, unknown> }) {
    const accessToken = getCookieValue(loginResponse, 'access_token');
    const csrfToken = getCookieValue(loginResponse, 'csrf-token');

    expect(accessToken).toBeTruthy();
    expect(csrfToken).toBeTruthy();

    if (!accessToken || !csrfToken) {
      throw new Error('Expected auth cookies were not set');
    }

    return {
      Authorization: `Bearer ${accessToken}`,
      Cookie: `csrf-token=${csrfToken}`,
      'X-CSRF-Token': csrfToken,
    };
  }

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

  describe('PATCH /profiles/me persistence', () => {
    it('persists a full profile update and preserves omitted fields on later partial updates', async () => {
      const email = `profile-veteran-${runId}@test.com`;
      const password = 'VeteranPassphrase99!';

      await createVerifiedVeteran(email, password);

      const loginRes = await loginUser(http, email, password);
      expect(loginRes.status).toBe(200);
      const headers = getProfileMutationHeaders(loginRes);

      const fullUpdateRes = await http
        .patch('/api/v1/profiles/me')
        .set(headers)
        .send({
          displayName: 'Casey Morgan',
          bio: 'Signals veteran and volunteer mentor.',
          gender: 'NON_BINARY',
          dateOfBirth: '1988-06-15',
          location: 'Leeds',
          interests: ['Hiking', 'Mentoring', 'Photography'],
        });

      expect(fullUpdateRes.status).toBe(200);
      expect(fullUpdateRes.body.data.displayName).toBe('Casey Morgan');
      expect(fullUpdateRes.body.data.bio).toBe('Signals veteran and volunteer mentor.');
      expect(fullUpdateRes.body.data.gender).toBe('NON_BINARY');
      expect(fullUpdateRes.body.data.location).toBe('Leeds');
      expect(fullUpdateRes.body.data.interests).toEqual(['Hiking', 'Mentoring', 'Photography']);
      expect(String(fullUpdateRes.body.data.dateOfBirth)).toContain('1988-06-15');

      const getAfterFullUpdate = await http
        .get('/api/v1/profiles/me')
        .set('Authorization', headers.Authorization);

      expect(getAfterFullUpdate.status).toBe(200);
      expect(getAfterFullUpdate.body.data.displayName).toBe('Casey Morgan');
      expect(getAfterFullUpdate.body.data.bio).toBe('Signals veteran and volunteer mentor.');
      expect(getAfterFullUpdate.body.data.gender).toBe('NON_BINARY');
      expect(getAfterFullUpdate.body.data.location).toBe('Leeds');
      expect(getAfterFullUpdate.body.data.interests).toEqual(['Hiking', 'Mentoring', 'Photography']);
      expect(String(getAfterFullUpdate.body.data.dateOfBirth)).toContain('1988-06-15');

      const partialUpdateRes = await http
        .patch('/api/v1/profiles/me')
        .set(headers)
        .send({
          location: 'York',
        });

      expect(partialUpdateRes.status).toBe(200);
      expect(partialUpdateRes.body.data.location).toBe('York');
      expect(partialUpdateRes.body.data.displayName).toBe('Casey Morgan');
      expect(partialUpdateRes.body.data.bio).toBe('Signals veteran and volunteer mentor.');
      expect(partialUpdateRes.body.data.interests).toEqual(['Hiking', 'Mentoring', 'Photography']);

      const getAfterPartialUpdate = await http
        .get('/api/v1/profiles/me')
        .set('Authorization', headers.Authorization);

      expect(getAfterPartialUpdate.status).toBe(200);
      expect(getAfterPartialUpdate.body.data.displayName).toBe('Casey Morgan');
      expect(getAfterPartialUpdate.body.data.bio).toBe('Signals veteran and volunteer mentor.');
      expect(getAfterPartialUpdate.body.data.gender).toBe('NON_BINARY');
      expect(getAfterPartialUpdate.body.data.location).toBe('York');
      expect(getAfterPartialUpdate.body.data.interests).toEqual(['Hiking', 'Mentoring', 'Photography']);
      expect(String(getAfterPartialUpdate.body.data.dateOfBirth)).toContain('1988-06-15');
    });

    it('sanitizes duplicate and empty interests', async () => {
      const email = `profile-interests-${runId}@test.com`;
      const password = 'VeteranPassphrase99!';

      await createVerifiedVeteran(email, password);

      const loginRes = await loginUser(http, email, password);
      expect(loginRes.status).toBe(200);
      const headers = getProfileMutationHeaders(loginRes);

      const updateRes = await http
        .patch('/api/v1/profiles/me')
        .set(headers)
        .send({
          interests: [' Hiking ', '', 'hiking', 'Mentoring', ' mentoring ', 'Photography'],
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.interests).toEqual(['Hiking', 'Mentoring', 'Photography']);

      const getRes = await http
        .get('/api/v1/profiles/me')
        .set('Authorization', headers.Authorization);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.interests).toEqual(['Hiking', 'Mentoring', 'Photography']);
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
