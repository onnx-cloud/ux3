import { test, expect } from './decl-fixtures';

// tests for news and market pages in the IAM example

test('news page shows articles', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG [news]:', msg.text()));
  await page.goto('/news');
  // dump HTML so we can inspect if view component is present
  console.log('PAGE HTML [news]', await page.content());
  // wait for UX3 to initialize and the FSM to reach loaded state
  await page.waitForSelector('div[ux-state="news.loaded"]', { timeout: 10000 });
  // now articles should be present
  await page.waitForSelector('ul li h3');
  const titles = await page.$$eval('ul li h3', els => els.map(e => e.textContent));
  expect(titles.length).toBeGreaterThan(0);
});

test('market page displays table and chart element', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG [market]:', msg.text()));
  await page.goto('/market');
  console.log('PAGE HTML [market]', await page.content());
  await page.waitForSelector('div[ux-state="market.loaded"]', { timeout: 10000 });
  await page.waitForSelector('table tr');
  const rows = await page.$$eval('table tr', els => els.length);
  expect(rows).toBeGreaterThan(1);
  // chart canvas should exist
  const canvas = await page.$('#market-chart');
  expect(canvas).not.toBeNull();
});
