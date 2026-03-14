import { expect, test } from '@playwright/test';
import { mockCurrentAdmin, mockVerificationQueue, seedAdminAuth } from './support/mock-api';

test('verification queue loads requests and SLA indicators', async ({ page }) => {
  await seedAdminAuth(page);
  await mockCurrentAdmin(page);
  await mockVerificationQueue(page);

  await page.goto('/verification');

  await expect(page.getByRole('heading', { name: /verification queue/i })).toBeVisible();
  await expect(page.getByText('Casey Hughes')).toBeVisible();
  await expect(page.getByText('Urgent', { exact: true })).toBeVisible();
  await expect(page.getByText(/39.2h \/ 48h/i)).toBeVisible();
});
