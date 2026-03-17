import { expect, test } from '@playwright/test';
import {
  mockCurrentUser,
  mockSubscription,
  mockUnauthorizedCurrentUser,
  mockUnreadCounts,
  mockVerificationStatus,
  seedAuthState,
  unverifiedUser,
} from './support/mock-api';

test('protected routes redirect back to login when auth fails', async ({ page }) => {
  await mockUnauthorizedCurrentUser(page);

  await page.goto('/app/settings');

  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});

test('settings exposes verification and account controls for authenticated users', async ({ page }) => {
  await seedAuthState(page, unverifiedUser);
  await mockCurrentUser(page, unverifiedUser);
  await mockUnreadCounts(page);
  await mockSubscription(page, 'FREE');
  await mockVerificationStatus(page, []);

  await page.goto('/app/settings');

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByText('Veteran Verification')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Privacy', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
});

test('verification flow lets an unverified user start a submission', async ({ page }) => {
  await seedAuthState(page, unverifiedUser);
  await mockCurrentUser(page, unverifiedUser);
  await mockUnreadCounts(page);
  await mockSubscription(page, 'FREE');
  await mockVerificationStatus(page, []);
  await page.route('**/api/verification/submit', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { id: 'verification-1', status: 'PENDING' },
        timestamp: new Date().toISOString(),
      }),
    }),
  );

  await page.goto('/app/settings');
  await page.getByRole('button', { name: /add files & submit for verification/i }).click();
  await expect(page.getByText('Submit Verification Documents')).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'veteran-card.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('mock verification content'),
  });

  await page.getByRole('button', { name: /^Submit$/ }).click();
  await expect(page.getByText(/documents submitted/i)).toBeVisible();
});
