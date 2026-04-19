import { test } from '@playwright/test';

test('debug account page markup', async ({ page }) => {
  await page.goto('/account', { waitUntil: 'networkidle' });
  console.log('url', page.url());
  console.log('has #ux-content', await page.$('#ux-content') !== null);
  console.log('body text length', await page.evaluate(() => document.body.innerText.length));
  console.log('body html first 400', await page.evaluate(() => document.body.innerHTML.slice(0, 400)));
  console.log('states', await page.$$eval('[ux-state]', els => els.map(e => e.getAttribute('ux-state'))));
});
