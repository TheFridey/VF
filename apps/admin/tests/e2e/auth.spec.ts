import { expect, test } from '@playwright/test';
import { mockAdminLogin, mockCurrentAdmin, mockDashboard } from './support/mock-api';

test('admin login redirects into the dashboard shell', async ({ page }) => {
  await mockAdminLogin(page);
  await mockCurrentAdmin(page);
  await mockDashboard(page);

  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill('admin@veteranfinder.co.uk');
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /command dashboard/i })).toBeVisible();
});
