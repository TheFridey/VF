import { expect, test } from '@playwright/test';
import { incompleteUser, memberUser, mockBrothersDashboard, mockCurrentUser, seedCookieConsent } from './support/mock-api';

test('login sends a returning member into the app', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { user: memberUser },
        timestamp: new Date().toISOString(),
      }),
    }),
  );
  await mockCurrentUser(page, memberUser);
  await mockBrothersDashboard(page);
  await seedCookieConsent(page);

  await page.goto('/auth/login');
  await page.locator('input[name="email"]').fill('member@example.com');
  await page.locator('input[name="password"]').fill('Password123!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/app\/brothers$/);
  await expect(page.getByRole('heading', { name: 'Brothers in Arms' })).toBeVisible();
  await expect(page.getByText('Find veterans you may have served alongside')).toBeVisible();
});

test('signup flows into onboarding', async ({ page }) => {
  await page.route('**/api/auth/register', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { user: incompleteUser },
        timestamp: new Date().toISOString(),
      }),
    }),
  );
  await seedCookieConsent(page);

  await page.goto('/auth/register');
  await page.locator('input[name="email"]').fill('new.user@example.com');
  await page.locator('input[name="password"]').fill('StrongPass!234');
  await page.locator('input[name="confirmPassword"]').fill('StrongPass!234');
  await page.getByRole('button', { name: /18 years of age or older/i }).click();
  await page.getByRole('button', { name: /terms of service/i }).click();
  await page.getByRole('button', { name: /privacy policy/i }).click();
  await page.addInitScript((user) => {
    window.localStorage.setItem(
      'auth-user',
      JSON.stringify({
        state: { user },
        version: 0,
      }),
    );
  }, incompleteUser);
  await mockCurrentUser(page, incompleteUser);
  const registerRequest = page.waitForRequest('**/api/auth/register');
  await page.getByRole('button', { name: 'Create Account' }).click();
  await registerRequest;
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();

  await page.getByRole('button', { name: /set up my profile/i }).click();
  await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible();
});
