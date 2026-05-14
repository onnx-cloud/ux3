import { test, expect } from '@playwright/test';
import { loadI18n } from './load-kitchen-sink-config';

const i18n = loadI18n('en');

test.describe('Live Agentic Host', () => {
  test('renders MCP host route and core shell', async ({ page }) => {
    await page.goto('/mcp', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('ux-app-shell', { state: 'attached', timeout: 20000 });

    const content = page.locator('#ux-content');
    await expect(content).toBeAttached();
    await expect(page.locator('ux-mcp').first()).toBeAttached();

    const title = i18n?.mcp?.heading || 'MCP';
    if (title) {
      await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
