/**
 * Kitchen Sink E2E Tests
 * Covers the IAM example app's shell, route rendering, and navigation flow.
 */

import { test, expect, Page } from '@playwright/test';

const appRoutes = [
  '/',
  '/home',
  '/login',
  '/sign-up',
  '/dashboard',
  '/market',
  '/blog',
  '/news',
  '/account',
  '/billing',
  '/macro',
  '/for-you',
  '/chat',
];

async function waitForApp(page: Page, timeout = 15000) {
  await page.waitForFunction(() => !!(window as any).__ux3App, { timeout });
  await page.waitForFunction(() => {
    const container = document.querySelector('#ux-content');
    if (!container) return false;
    const viewChildren = Array.from(container.children).filter(el =>
      el.tagName.toLowerCase().startsWith('ux-')
    );
    return viewChildren.length === 1;
  }, { timeout });
}

async function loadRoute(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'networkidle' });
  await waitForApp(page);
  await page.waitForSelector('body > #ux-content', { state: 'attached', timeout: 10000 });
}

async function routeHasMountedShell(page: Page) {
  return (await page.locator('body > #ux-content').count()) === 1;
}

test.describe('Kitchen sink app flow', () => {
  test('main app shell is mounted', async ({ page }) => {
    await loadRoute(page, '/login');
    await expect(page.locator('body > #ux-content')).toHaveCount(1);
  });

  test('login route renders the login page structure', async ({ page }) => {
    await loadRoute(page, '/login');
    await expect(page.locator('body > #ux-content > *')).toHaveCount(1);
    await expect(page.locator('[ux-state="login.idle"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('login idle state has a SUBMIT button', async ({ page }) => {
    await loadRoute(page, '/login');
    const btn = page.locator('[ux-state="login.idle"] button[ux-event="SUBMIT"]');
    await expect(btn).toHaveCount(1);
    await expect(btn).toBeVisible();
  });

  test('login submit button text is not raw template syntax', async ({ page }) => {
    await loadRoute(page, '/login');
    const btn = page.locator('[ux-state="login.idle"] button[ux-event="SUBMIT"]');
    const text = await btn.textContent();
    expect(text).not.toContain('{{');
    expect(text).not.toContain('}}');
  });

  test('dashboard enters loading state and refreshes if loaded', async ({ page }) => {
    await loadRoute(page, '/dashboard');
    await page.waitForSelector('[ux-state="dashboard.loading"]', { state: 'attached', timeout: 15000 });

    const loadedCount = await page.locator('[ux-state="dashboard.loaded"]').count();
    if (loadedCount > 0) {
      const refresh = page.locator('[ux-state="dashboard.loaded"] button[ux-event="REFRESH"]');
      await expect(refresh).toHaveCount(1);
      await refresh.click();
      await page.waitForSelector('[ux-state="dashboard.loading"]', { state: 'attached', timeout: 15000 });
    }
  });

  test('sign-up route renders the sign-up page structure', async ({ page }) => {
    await loadRoute(page, '/sign-up');
    await expect(page.locator('body > #ux-content > *')).toHaveCount(1);
    await expect(page.locator('[ux-state="sign-up.idle"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('sign-up idle state contains the widget container', async ({ page }) => {
    await loadRoute(page, '/sign-up');
    await expect(page.locator('[ux-state="sign-up.idle"] [ux-style="widget"]')).toHaveCount(1);
  });

  test('login route renders a single login state wrapper', async ({ page }) => {
    await loadRoute(page, '/login');
    expect(await page.locator('[ux-state="login.idle"]').count()).toBe(1);
  });

  test('sign-up page markup does not contain raw template placeholders', async ({ page }) => {
    await loadRoute(page, '/sign-up');
    const html = await page.content();
    expect(html).not.toContain('{{');
    expect(html).not.toContain('}}');
  });

  test('page has a main or UX content landmark', async ({ page }) => {
    await loadRoute(page, '/');
    const count = await page.locator('main, [role="main"], #ux-content').count();
    expect(count).toBeGreaterThan(0);
  });

  test('every app route mounts into the shared ux-content shell', async ({ page }) => {
    for (const route of appRoutes) {
      await loadRoute(page, route);
      expect(await routeHasMountedShell(page)).toBe(true);
    }
  });

  test('dashboard route renders dashboard state', async ({ page }) => {
    await loadRoute(page, '/dashboard');
    await page.waitForSelector('[ux-state^="dashboard."]', { state: 'attached', timeout: 5000 });
  });

  test('blog route renders blog state content', async ({ page }) => {
    await loadRoute(page, '/blog');
    await page.waitForSelector('[ux-state^="blog."]', { state: 'attached', timeout: 5000 });
  });

  test('market route renders market state content', async ({ page }) => {
    await loadRoute(page, '/market');
    await page.waitForSelector('[ux-state^="market."]', { state: 'attached', timeout: 5000 });
  });

  test('news route renders news state content', async ({ page }) => {
    await loadRoute(page, '/news');
    await page.waitForSelector('[ux-state^="news."]', { state: 'attached', timeout: 5000 });
  });

  test('macro route renders macro state content', async ({ page }) => {
    await loadRoute(page, '/macro');
    await page.waitForSelector('[ux-state^="macro."]', { state: 'attached', timeout: 5000 });
  });

  test('for-you route renders for-you state content', async ({ page }) => {
    await loadRoute(page, '/for-you');
    await page.waitForSelector('[ux-state^="for-you."]', { state: 'attached', timeout: 5000 });
  });

  test('chat route renders chat state content', async ({ page }) => {
    await loadRoute(page, '/chat');
    await page.waitForSelector('[ux-state^="chat."]', { state: 'attached', timeout: 5000 });
  });

  test('account route loads and does not 404', async ({ page }) => {
    await loadRoute(page, '/account');
    expect(page.url().endsWith('/account')).toBe(true);
    await expect(page.locator('body > #ux-content')).toHaveCount(1);
  });

  test('billing route loads a billing page structure', async ({ page }) => {
    await loadRoute(page, '/billing');
    await expect(page.locator('body > #ux-content')).toHaveCount(1);
  });

  test('home route renders the root view structure', async ({ page }) => {
    await loadRoute(page, '/home');
    await expect(page.locator('body > #ux-content > *')).toHaveCount(1);
  });

  test('root route renders a view container', async ({ page }) => {
    await loadRoute(page, '/');
    await expect(page.locator('body > #ux-content > *')).toHaveCount(1);
  });

  test('navigation does not expose raw template syntax', async ({ page }) => {
    await loadRoute(page, '/login');
    const html = await page.content();
    expect(html).not.toContain('{{');
    expect(html).not.toContain('}}');
  });

  test('route transitions remain functional after shell mount', async ({ page }) => {
    await loadRoute(page, '/dashboard');
    await loadRoute(page, '/login');
    await page.waitForSelector('[ux-state="login.idle"]', { timeout: 5000 });
  });

  test('login state wrapper has child content', async ({ page }) => {
    await loadRoute(page, '/login');
    const wrapper = page.locator('[ux-state="login.idle"]');
    expect(await wrapper.locator('*').count()).toBeGreaterThan(0);
  });

  test('sign-up route includes a visible route container', async ({ page }) => {
    await loadRoute(page, '/sign-up');
    await expect(page.locator('[ux-state="sign-up.idle"]')).toHaveCount(1);
  });
});
