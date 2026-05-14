import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for UX3 Framework E2E Tests
 *
 * This configuration sets up Playwright for comprehensive end-to-end testing
 * of the UX3 framework's IAM example application and core functionality.
 */

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/kitchen-sink.spec.ts', '**/config-driven.spec.ts', '**/navigation.spec.ts', '**/form-system.spec.ts'],
  // keep all generated artifacts under test-results
  outputDir: 'test-results/playwright/artifacts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,

  reporter: [
    ['html', { outputFolder: 'test-results/playwright/html' }],
    ['json', { outputFile: 'test-results/playwright/results.json' }],
    ['junit', { outputFile: 'test-results/playwright/results.xml' }],
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

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev:kitchen.sink',
    url: 'http://127.0.0.1:1337',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
