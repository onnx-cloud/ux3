import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/kitchen-sink.spec.ts'],
  outputDir: 'playwright-report/kitchen-sink',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report-html/kitchen-sink' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://127.0.0.1:1337',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:kitchen.sink',
    url: 'http://127.0.0.1:1337',
    reuseExistingServer: true,
    timeout: 120000,
  },
});