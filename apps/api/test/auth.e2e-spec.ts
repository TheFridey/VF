import * as request from 'supertest';
import {
  createTestApp,
  TestApp,
  registerUser,
  verifyUserEmail,
  loginUser,
  getCookieHeader,
  getCookieValue,
} from './test-helpers';

describe('Auth E2E', () => {
  let testApp: TestApp;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    testApp = await createTestApp();
    ({ http } = testApp);
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  it('proves signup, verify-email, login, protected access, refresh, and logout end-to-end', async () => {
    const email = `auth-${testApp.runId}@test.com`;
    const password = 'CorrectHorseBatteryStaple99!';

    const registerRes = await registerUser(http, email, password);
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data?.message ?? registerRes.body.message).toMatch(/verification/i);

    const preVerifyLogin = await loginUser(http, email, password);
    expect(preVerifyLogin.status).toBe(401);
    expect(JSON.stringify(preVerifyLogin.body)).toMatch(/verify your email/i);

    const verifyRes = await verifyUserEmail(testApp.prisma, http, email);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data?.success ?? verifyRes.body.success).toBe(true);

    const loginRes = await loginUser(http, email, password);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data?.accessToken ?? loginRes.body.accessToken).toBeUndefined();
    expect(loginRes.body.data?.refreshToken ?? loginRes.body.refreshToken).toBeUndefined();

    const setCookie = loginRes.headers['set-cookie'] as unknown as string[];
    const accessToken = getCookieValue(loginRes, 'access_token');
    const refreshToken = getCookieValue(loginRes, 'refresh_token');
    const csrfToken = getCookieValue(loginRes, 'csrf-token');
    expect(setCookie.some((cookie) => cookie.includes('access_token='))).toBe(true);
    expect(setCookie.some((cookie) => cookie.includes('refresh_token='))).toBe(true);
    expect(setCookie.some((cookie) => cookie.includes('HttpOnly'))).toBe(true);
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
    expect(csrfToken).toBeTruthy();

    if (!accessToken || !refreshToken || !csrfToken) {
      throw new Error('Expected auth cookies were not set');
    }

    const meRes = await http
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(email);
    expect(meRes.body.data.emailVerified).toBe(true);

    const anonymousMe = await http.get('/api/v1/auth/me');
    expect(anonymousMe.status).toBe(401);

    const refreshRes = await http
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data ?? refreshRes.body).toEqual({ success: true });

    const refreshedAccessToken = getCookieValue(refreshRes, 'access_token');
    expect(refreshedAccessToken).toBeTruthy();

    if (!refreshedAccessToken) {
      throw new Error('Expected refreshed access token cookie');
    }

    const logoutRes = await http
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${refreshedAccessToken}`)
      .set('Cookie', `csrf-token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({});

    expect(logoutRes.status).toBe(200);
    const logoutCookies = logoutRes.headers['set-cookie'] as unknown as string[];
    expect(logoutCookies.some((cookie) => cookie.includes('access_token=;'))).toBe(true);
    expect(logoutCookies.some((cookie) => cookie.includes('refresh_token=;'))).toBe(true);

    const postLogoutMe = await http
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refreshedAccessToken}`);
    expect(postLogoutMe.status).toBe(401);
  });
});
