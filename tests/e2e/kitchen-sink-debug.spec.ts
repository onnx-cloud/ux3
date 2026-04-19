import { test } from '@playwright/test';

test('debug login and account states', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' });
  console.log('login initial states', await page.$$eval('[ux-state]', els => els.map(e => e.getAttribute('ux-state'))));
  await page.click('[ux-state="login.idle"] button[ux-event="SUBMIT"]');
  await page.waitForTimeout(1000);
  console.log('login after click states', await page.$$eval('[ux-state]', els => els.map(e => e.getAttribute('ux-state'))));
  await page.goto('/account', { waitUntil: 'networkidle' });
  console.log('account states after load', await page.$$eval('[ux-state]', els => els.map(e => e.getAttribute('ux-state'))));
});
