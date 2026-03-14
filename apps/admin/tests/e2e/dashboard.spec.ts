import { expect, test } from '@playwright/test';
import { mockCurrentAdmin, mockDashboard, seedAdminAuth } from './support/mock-api';

test('dashboard metrics render inside the protected shell', async ({ page }) => {
  await seedAdminAuth(page);
  await mockCurrentAdmin(page);
  await mockDashboard(page);

  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: /command dashboard/i })).toBeVisible();
  await expect(page.getByText(/1,204|1204/)).toBeVisible();
  await expect(page.getByText('Verified Veterans')).toBeVisible();
  await expect(page.getByText('Verification queue')).toBeVisible();
});
