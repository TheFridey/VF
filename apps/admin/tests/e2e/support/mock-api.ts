import type { Page, Route } from '@playwright/test';

function wrapData(data: unknown) {
  return {
    data,
    timestamp: new Date().toISOString(),
  };
}

async function json(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

export const adminUser = {
  id: 'admin-user',
  email: 'admin@veteranfinder.co.uk',
  role: 'ADMIN',
  status: 'ACTIVE',
  emailVerified: true,
  profile: {
    displayName: 'Admin User',
  },
};

export async function seedAdminAuth(page: Page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem(
      'admin-auth-user',
      JSON.stringify({
        state: { user },
        version: 0,
      }),
    );
  }, adminUser);
}

export async function mockAdminLogin(page: Page) {
  await page.route('**/api/auth/login', (route) =>
    json(route, wrapData({ user: adminUser })),
  );
}

export async function mockCurrentAdmin(page: Page) {
  await page.route('**/api/auth/me', (route) =>
    json(route, wrapData(adminUser)),
  );
}

export async function mockDashboard(page: Page) {
  await page.route('**/api/admin/dashboard', (route) =>
    json(route, wrapData({
      totalUsers: 1204,
      activeUsers: 416,
      verifiedVeterans: 287,
      pendingVerifications: 6,
      pendingReports: 3,
      totalConnections: 912,
      newUsersToday: 9,
      matchesToday: 17,
      userGrowth: 12,
      suspendedUsers: 2,
    })),
  );

  await page.route('**/api/admin/health', (route) =>
    json(route, wrapData({
      status: 'ok',
      database: { status: 'ok', latency: 14 },
      redis: { status: 'ok', latency: 5 },
    })),
  );
}

export async function mockVerificationQueue(page: Page) {
  await page.route('**/api/verification/admin/pending*', (route) =>
    json(route, wrapData({
      requests: [
        {
          id: 'verif-1',
          status: 'PENDING',
          createdAt: '2026-03-14T08:00:00.000Z',
          evidenceUrls: ['https://example.com/evidence-1'],
          user: {
            id: 'user-1',
            email: 'veteran@example.com',
            profile: {
              displayName: 'Casey Hughes',
              branch: 'BRITISH_ARMY',
              unit: 'Royal Signals',
            },
          },
          sla: {
            urgency: 'urgent',
            hoursElapsed: 39.2,
            targetHours: 48,
          },
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
      slaSummary: {
        normal: 0,
        urgent: 1,
        breached: 0,
      },
    })),
  );
}

