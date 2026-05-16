import { expect, test } from '@playwright/test';
import {
  memberUser,
  mockBrothersDashboard,
  mockSubscription,
  mockUnreadCounts,
  seedAuthState,
} from './support/mock-api';

test('profile values persist after save, reload, and navigation', async ({ page }) => {
  let profileState: {
    id: string;
    userId: string;
    displayName: string;
    bio: string;
    gender: string | null;
    dateOfBirth: string | null;
    location: string;
    interests: string[];
    updatedAt: string;
  } = {
    id: 'profile-1',
    userId: memberUser.id,
    displayName: 'Alex Morgan',
    bio: '',
    gender: null,
    dateOfBirth: null,
    location: '',
    interests: [],
    updatedAt: '2026-05-16T09:00:00.000Z',
  };

  await seedAuthState(page, memberUser);
  await mockUnreadCounts(page);
  await mockSubscription(page, 'BIA');
  await mockBrothersDashboard(page);
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          ...memberUser,
          profile: {
            ...memberUser.profile,
            displayName: profileState.displayName,
            bio: profileState.bio,
            gender: profileState.gender ?? undefined,
            dateOfBirth: profileState.dateOfBirth ?? undefined,
            location: profileState.location,
          },
        },
        timestamp: new Date().toISOString(),
      }),
    });
  });
  await page.route('**/api/messaging/conversations', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          conversations: [],
        },
        timestamp: new Date().toISOString(),
      }),
    });
  });
  await page.route('**/api/connections', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          connections: [],
        },
        timestamp: new Date().toISOString(),
      }),
    });
  });
  await page.route('**/api/auth/socket-token', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { token: 'socket-token' },
        timestamp: new Date().toISOString(),
      }),
    });
  });
  await page.route('**/api/uploads/photos', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        timestamp: new Date().toISOString(),
      }),
    });
  });
  await page.route('**/api/notifications/vapid-key', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { publicKey: 'test-vapid-key' },
        timestamp: new Date().toISOString(),
      }),
    });
  });

  await page.route('**/api/profiles/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON() as {
        displayName?: string;
        bio?: string;
        gender?: string;
        dateOfBirth?: string;
        location?: string;
        interests?: string[];
      };

      profileState = {
        ...profileState,
        ...payload,
        dateOfBirth: payload.dateOfBirth ? `${payload.dateOfBirth}T00:00:00.000Z` : profileState.dateOfBirth,
        interests: payload.interests ?? profileState.interests,
        updatedAt: '2026-05-16T09:30:00.000Z',
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: profileState,
          timestamp: new Date().toISOString(),
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: profileState,
        timestamp: new Date().toISOString(),
      }),
    });
  });

  await page.route('**/api/veterans/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'veteran-1',
          userId: memberUser.id,
          branch: 'BRITISH_ARMY',
          rank: 'Sergeant',
          regiment: 'royal-signals',
          mos: 'Signals',
          deployments: [],
          dutyStations: [],
          servicePeriods: [],
        },
        timestamp: new Date().toISOString(),
      }),
    });
  });

  await page.goto('/app/profile');
  await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();

  await page.getByLabel('Display Name').fill('Jordan Blake');
  await page.getByLabel('Gender').selectOption('NON_BINARY');
  await page.getByLabel('Date of Birth').fill('1988-06-15');
  await page.getByLabel('Location').fill('Leeds');
  await page.getByLabel('Bio').fill('Signals veteran and volunteer mentor.');

  await page.getByPlaceholder('Add an interest').fill('Hiking');
  await page.getByPlaceholder('Add an interest').press('Enter');
  await page.getByPlaceholder('Add an interest').fill('Mentoring');
  await page.getByPlaceholder('Add an interest').press('Enter');

  await page.getByRole('button', { name: /save changes/i }).click();
  await expect(page.getByRole('button', { name: /save changes/i })).toBeDisabled();

  await expect(page.getByLabel('Display Name')).toHaveValue('Jordan Blake');
  await expect(page.getByLabel('Gender')).toHaveValue('NON_BINARY');
  await expect(page.getByLabel('Date of Birth')).toHaveValue('1988-06-15');
  await expect(page.getByLabel('Location')).toHaveValue('Leeds');
  await expect(page.getByLabel('Bio')).toHaveValue('Signals veteran and volunteer mentor.');
  await expect(page.getByText('Hiking').first()).toBeVisible();
  await expect(page.getByText('Mentoring').first()).toBeVisible();

  await page.reload();

  await expect(page.getByLabel('Display Name')).toHaveValue('Jordan Blake');
  await expect(page.getByLabel('Gender')).toHaveValue('NON_BINARY');
  await expect(page.getByLabel('Date of Birth')).toHaveValue('1988-06-15');
  await expect(page.getByLabel('Location')).toHaveValue('Leeds');
  await expect(page.getByLabel('Bio')).toHaveValue('Signals veteran and volunteer mentor.');

  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening), jordan/i })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/app\/profile$/);

  await expect(page.getByLabel('Display Name')).toHaveValue('Jordan Blake');
  await expect(page.getByLabel('Gender')).toHaveValue('NON_BINARY');
  await expect(page.getByLabel('Date of Birth')).toHaveValue('1988-06-15');
  await expect(page.getByLabel('Location')).toHaveValue('Leeds');
  await expect(page.getByLabel('Bio')).toHaveValue('Signals veteran and volunteer mentor.');
  await expect(page.getByText('Hiking').first()).toBeVisible();
  await expect(page.getByText('Mentoring').first()).toBeVisible();
});
