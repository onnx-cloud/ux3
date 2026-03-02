import { test, expect } from './decl-fixtures';

// tests for news and market pages in the IAM example

test('news page shows articles', async ({ page }) => {
  await page.goto('/news');
  // wait for loading to complete and articles to render
  await page.waitForSelector('ul li h3');
  const titles = await page.$$eval('ul li h3', els => els.map(e => e.textContent));
  expect(titles.length).toBeGreaterThan(0);
});

test('market page displays table and chart element', async ({ page }) => {
  await page.goto('/market');
  await page.waitForSelector('table tr');
  const rows = await page.$$eval('table tr', els => els.length);
  expect(rows).toBeGreaterThan(1);
  // chart canvas should exist
  const canvas = await page.$('#market-chart');
  expect(canvas).not.toBeNull();
});
