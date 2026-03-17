import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 3102);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const webServer = process.env.PLAYWRIGHT_BASE_URL
  ? undefined
  : {
      command: `npx next dev -p ${port}`,
      cwd: __dirname,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    };

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: !process.env.PLAYWRIGHT_BASE_URL,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.PLAYWRIGHT_BASE_URL ? 1 : undefined,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
