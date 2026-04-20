import { test, expect } from './decl-fixtures';

// tests for news and market pages in the IAM example

test('news page mounts and shows a loading state', async ({ page }) => {
  page.on('console', msg => {
    console.log('PAGE LOG [news]', msg.type(), msg.text(), ...msg.args());
  });
  page.on('pageerror', e => {
    console.log('PAGE ERROR [news]', e);
  });
  await page.goto('/news');
  await page.waitForSelector('ux-news >> div[ux-state="news.loading"]', { timeout: 10000 });
  const loadingText = await page.locator('ux-news >> div[ux-state="news.loading"]').textContent();
  expect(loadingText).toContain('Loading news');
});

test('market page mounts and shows a loading state', async ({ page }) => {
  page.on('console', msg => {
    console.log('PAGE LOG [market]', msg.type(), msg.text(), ...msg.args());
  });
  page.on('pageerror', e => {
    console.log('PAGE ERROR [market]', e);
  });
  await page.goto('/market');
  await page.waitForSelector('ux-market >> div[ux-state="market.loading"]', { timeout: 10000 });
  const loadingText = await page.locator('ux-market >> div[ux-state="market.loading"]').textContent();
  expect(loadingText).toContain('Loading market data');
});
