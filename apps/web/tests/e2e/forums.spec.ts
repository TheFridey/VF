import { expect, test } from '@playwright/test';
import {
  memberUser,
  mockCurrentUser,
  mockForumIndex,
  mockForumThreads,
  mockThreadView,
  seedAuthState,
} from './support/mock-api';

test('members can browse from forum index into a thread', async ({ page }) => {
  await seedAuthState(page, memberUser);
  await mockCurrentUser(page, memberUser);
  await mockForumIndex(page);
  await mockForumThreads(page);
  await mockThreadView(page);

  await page.goto('/app/bia/forums');
  await expect(page.getByRole('heading', { name: /premium veteran forum network/i })).toBeVisible();
  await expect(page.getByText('History and Reunions')).toBeVisible();

  await page.goto('/app/bia/forums/history-and-reunions');
  await expect(page).toHaveURL(/\/app\/bia\/forums\/history-and-reunions$/);
  await expect(page.getByText('Planning the next reunion for former signals platoon')).toBeVisible();

  await page.goto('/app/bia/forums/thread/thread-1');
  await expect(page).toHaveURL(/\/app\/bia\/forums\/thread\/thread-1$/);
  await expect(page.getByText(/let us pull together likely dates/i)).toBeVisible();
});
