import { UserRole, UserStatus, VerificationStatus } from '@prisma/client';
import {
  createStaffUser,
  createTestApp,
  getCookieHeader,
  getCookieValue,
  loginUser,
  registerUser,
  TestApp,
  verifyUserEmail,
} from './test-helpers';

describe('Verification E2E', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  it('proves submission, admin review, and verified-user state update end-to-end', async () => {
    const userEmail = `verification-${testApp.runId}@test.com`;
    const userPassword = 'CorrectHorseBatteryStaple99!';
    const adminEmail = `admin-${testApp.runId}@test.com`;
    const adminPassword = 'AdminPassphrase99!';

    await registerUser(testApp.http, userEmail, userPassword);
    await verifyUserEmail(testApp.prisma, testApp.http, userEmail);

    const userLogin = await loginUser(testApp.http, userEmail, userPassword);
    expect(userLogin.status).toBe(200);
    const userAccessToken = getCookieValue(userLogin, 'access_token');
    const userCsrfToken = getCookieValue(userLogin, 'csrf-token');
    expect(userAccessToken).toBeTruthy();
    expect(userCsrfToken).toBeTruthy();

    if (!userAccessToken || !userCsrfToken) {
      throw new Error('Expected user auth cookies were not set');
    }

    const submitRes = await testApp.http
      .post('/api/v1/verification/submit')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .set('Cookie', `csrf-token=${userCsrfToken}`)
      .set('X-CSRF-Token', userCsrfToken)
      .field('notes', 'Front and back of veteran card')
      .attach('files', Buffer.from('fake-image-data'), {
        filename: 'veteran-card.jpg',
        contentType: 'image/jpeg',
      });

    expect(submitRes.status).toBe(201);
    const submittedRequestId = submitRes.body.data.id as string;
    expect(submittedRequestId).toBeTruthy();

    const statusRes = await testApp.http
      .get('/api/v1/verification/status')
      .set('Authorization', `Bearer ${userAccessToken}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data).toHaveLength(1);
    expect(statusRes.body.data[0].status).toBe(VerificationStatus.PENDING);

    await createStaffUser(testApp.prisma, testApp.passwordSecurity, {
      email: adminEmail,
      password: adminPassword,
      role: UserRole.ADMIN,
    });

    const adminLogin = await loginUser(testApp.http, adminEmail, adminPassword);
    expect(adminLogin.status).toBe(200);
    const adminAccessToken = getCookieValue(adminLogin, 'access_token');
    const adminCsrfToken = getCookieValue(adminLogin, 'csrf-token');
    expect(adminAccessToken).toBeTruthy();
    expect(adminCsrfToken).toBeTruthy();

    if (!adminAccessToken || !adminCsrfToken) {
      throw new Error('Expected admin auth cookies were not set');
    }

    const pendingRes = await testApp.http
      .get('/api/v1/verification/admin/pending?limit=100')
      .set('Authorization', `Bearer ${adminAccessToken}`);
    expect(pendingRes.status).toBe(200);
    const pendingRequest = pendingRes.body.data.requests.find((request: { id: string; user: { email: string } }) =>
      request.id === submittedRequestId || request.user.email === userEmail,
    );
    expect(pendingRequest).toBeDefined();

    const approveRes = await testApp.http
      .patch(`/api/v1/verification/admin/requests/${pendingRequest.id}/approve`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .set('Cookie', `csrf-token=${adminCsrfToken}`)
      .set('X-CSRF-Token', adminCsrfToken)
      .send({ notes: 'Matched service evidence and approved.' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe(VerificationStatus.APPROVED);

    const updatedStatus = await testApp.http
      .get('/api/v1/verification/status')
      .set('Authorization', `Bearer ${userAccessToken}`);
    expect(updatedStatus.status).toBe(200);
    expect(updatedStatus.body.data[0].status).toBe(VerificationStatus.APPROVED);

    const userRecord = await testApp.prisma.user.findUnique({
      where: { email: userEmail },
      select: { role: true, status: true },
    });
    expect(userRecord).toEqual({
      role: UserRole.VETERAN_VERIFIED,
      status: UserStatus.ACTIVE,
    });

    const reloginRes = await loginUser(testApp.http, userEmail, userPassword);
    expect(reloginRes.status).toBe(200);
    const reloginAccessToken = getCookieValue(reloginRes, 'access_token');
    expect(reloginAccessToken).toBeTruthy();

    if (!reloginAccessToken) {
      throw new Error('Expected relogin access token cookie');
    }

    const meRes = await testApp.http
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${reloginAccessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.role).toBe(UserRole.VETERAN_VERIFIED);
    expect(meRes.body.data.status).toBe(UserStatus.ACTIVE);
  });
});
