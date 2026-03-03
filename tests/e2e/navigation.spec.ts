/**
 * SPA Navigation E2E Tests
 *
 * Tests that the IAM example application:
 *  1. Injects a REAL hydration script (not the "bundle pending" placeholder)
 *  2. Mounts the correct <ux-*> view element into #ux-content on each route
 *  3. Handles History API back/forward without full page reloads
 *  4. Intercepts local <a> clicks and performs client-side navigation
 *  5. Handles parameterised routes (e.g. /market/:exchange)
 *
 * These tests specifically guard against the recurring bugs:
 *  - Bundler silent failure → empty bundleRel → placeholder injected
 *  - View compiler generating un-resolvable imports (@ux3/ui, ux/logic/shared)
 *  - Navigation handler not wiring popstate / click intercept correctly
 */

import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wait until window.__ux3App is set (hydration complete) then return it.
 * Throws if initApp never runs within the timeout.
 */
async function waitForApp(page: Page, timeout = 12000) {
  await page.waitForFunction(() => !!(window as any).__ux3App, { timeout });
}

/**
 * Navigate via the History API without a full page reload, then wait for the
 * new view to mount.  Mirrors how the navigation handler works at runtime.
 */
async function spaNavigate(page: Page, pathname: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, pathname);
}

// ---------------------------------------------------------------------------
// Bundle injection regression
// ---------------------------------------------------------------------------

test.describe('Bundle injection', () => {
  test('hydration script contains real import() code, not the placeholder comment', async ({ page }) => {
    await page.goto('/');

    const hydrationEl = page.locator('script[data-ux3="hydration"]');
    await expect(hydrationEl).toHaveCount(1);

    const scriptText = await hydrationEl.textContent() ?? '';
    // Regression: was /* initApp – bundle pending */
    expect(scriptText).not.toContain('bundle pending');
    expect(scriptText).toContain('import(');
    expect(scriptText).toContain('initApp');
    expect(scriptText).toContain('DOMContentLoaded');
  });

  test('hydration script imports the bundle via dynamic import()', async ({ page }) => {
    await page.goto('/');

    const hydrationEl = page.locator('script[data-ux3="hydration"]');
    await expect(hydrationEl).toHaveCount(1);

    const scriptText = await hydrationEl.textContent() ?? '';
    // Extract bundle URL from import() call
    const importMatch = scriptText.match(/import\('([^']+)'\)/);
    expect(importMatch).toBeTruthy();
    const bundleUrl = importMatch![1];
    expect(bundleUrl).toContain('bundle.ts');
    
    // Verify the bundle URL points to a real file
    const resp = await page.request.get(bundleUrl);
    expect(resp.status()).toBe(200);
  });

  test('bundle.js is reachable (HTTP 200)', async ({ page }) => {
    await page.goto('/');

    const hydrationEl = page.locator('script[data-ux3="hydration"]');
    const scriptText = await hydrationEl.textContent() ?? '';
    
    // Extract bundle URL from dynamic import() in hydration script
    const importMatch = scriptText.match(/import\('([^']+)'\)/);
    expect(importMatch).toBeTruthy();
    const bundleUrl = importMatch![1];
    
    const resp = await page.request.get(bundleUrl);
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    expect(body.length).toBeGreaterThan(1000);
  });
});

// ---------------------------------------------------------------------------
// Hydration and app context
// ---------------------------------------------------------------------------

test.describe('App hydration', () => {
  test('window.__ux3App is set after initApp() runs', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const hasApp = await page.evaluate(() => !!(window as any).__ux3App);
    expect(hasApp).toBe(true);
  });

  test('__ux3App exposes machines, services and nav', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const shape = await page.evaluate(() => {
      const app = (window as any).__ux3App;
      return {
        hasMachines: typeof app.machines === 'object',
        hasServices: typeof app.services === 'object',
        hasNav: app.nav !== null && app.nav !== undefined,
      };
    });

    expect(shape.hasMachines).toBe(true);
    expect(shape.hasServices).toBe(true);
    expect(shape.hasNav).toBe(true);
  });

  test('page loads without [UX3 hydration] console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await waitForApp(page);

    const hydrationErrors = errors.filter(e => e.includes('[UX3 hydration]'));
    expect(hydrationErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// View mounting by route
// ---------------------------------------------------------------------------

test.describe('View mounting by route', () => {
  test('/ → a view element is mounted in #ux-content', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const count = await page.locator('#ux-content > *').count();
    expect(count).toBeGreaterThan(0);
  });

  test('/login → <ux-login> is mounted in #ux-content', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    await expect(page.locator('#ux-content > ux-login')).toHaveCount(1);
  });

  test('/sign-up → <ux-sign-up> is mounted in #ux-content', async ({ page }) => {
    await page.goto('/sign-up');
    await waitForApp(page);

    await expect(page.locator('#ux-content > ux-sign-up')).toHaveCount(1);
  });

  test('/dashboard → <ux-dashboard> is mounted', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForApp(page);

    await expect(page.locator('#ux-content > ux-dashboard')).toHaveCount(1);
  });

  test('/market/:exchange → <ux-market> is mounted (param route)', async ({ page }) => {
    await page.goto('/market/NASDAQ');
    await waitForApp(page);

    await expect(page.locator('#ux-content > ux-market')).toHaveCount(1);
  });

  test('/news → <ux-news> is mounted', async ({ page }) => {
    await page.goto('/news');
    await waitForApp(page);

    await expect(page.locator('#ux-content > ux-news')).toHaveCount(1);
  });

  test('only one view element exists in #ux-content at a time', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    const count = await page.locator('#ux-content > *').count();
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// SPA navigation (no full page reloads)
// ---------------------------------------------------------------------------

test.describe('SPA navigation via History API', () => {
  test('popstate event swaps the mounted view without a page reload', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);
    await expect(page.locator('#ux-content > ux-login')).toHaveCount(1);

    // Navigate to /sign-up using the History API (as the nav handler does)
    await spaNavigate(page, '/sign-up');

    await expect(page.locator('#ux-content > ux-sign-up')).toHaveCount(1, { timeout: 5000 });
    expect(new URL(page.url()).pathname).toBe('/sign-up');

    // Old view must be removed
    await expect(page.locator('#ux-content > ux-login')).toHaveCount(0);
  });

  test('multiple sequential popstate navigations all update the view', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await spaNavigate(page, '/login');
    await expect(page.locator('#ux-content > ux-login')).toHaveCount(1, { timeout: 5000 });

    await spaNavigate(page, '/sign-up');
    await expect(page.locator('#ux-content > ux-sign-up')).toHaveCount(1, { timeout: 5000 });

    await spaNavigate(page, '/news');
    await expect(page.locator('#ux-content > ux-news')).toHaveCount(1, { timeout: 5000 });
  });

  test('browser back button restores the previous view', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    // Navigate forward to /sign-up via SPA push
    await spaNavigate(page, '/sign-up');
    await expect(page.locator('#ux-content > ux-sign-up')).toHaveCount(1, { timeout: 5000 });

    // Hit browser back
    await page.goBack();

    await expect(page.locator('#ux-content > ux-login')).toHaveCount(1, { timeout: 5000 });
    expect(new URL(page.url()).pathname).toBe('/login');
  });

  test('browser forward button re-applies the next view', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    await spaNavigate(page, '/sign-up');
    await expect(page.locator('#ux-content > ux-sign-up')).toHaveCount(1, { timeout: 5000 });

    await page.goBack();
    await expect(page.locator('#ux-content > ux-login')).toHaveCount(1, { timeout: 5000 });

    await page.goForward();
    await expect(page.locator('#ux-content > ux-sign-up')).toHaveCount(1, { timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Anchor click interception
// ---------------------------------------------------------------------------

test.describe('Anchor click interception', () => {
  test('clicking an injected local <a> triggers SPA navigation', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    // Inject a link to a different route into the live page
    await page.evaluate(() => {
      const a = document.createElement('a');
      a.id = 'spa-test-link';
      a.href = '/sign-up';
      a.textContent = 'Go to sign-up';
      document.body.appendChild(a);
    });

    await page.click('#spa-test-link');

    await expect(page.locator('#ux-content > ux-sign-up')).toHaveCount(1, { timeout: 5000 });
    expect(new URL(page.url()).pathname).toBe('/sign-up');
  });

  test('clicking a link to a param route mounts the correct view', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.evaluate(() => {
      const a = document.createElement('a');
      a.id = 'param-link';
      a.href = '/market/NYSE';
      document.body.appendChild(a);
    });

    await page.click('#param-link');

    await expect(page.locator('#ux-content > ux-market')).toHaveCount(1, { timeout: 5000 });
    expect(new URL(page.url()).pathname).toBe('/market/NYSE');
  });

  test('clicking an external link does not change the mounted view', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    const beforeView = await page.locator('#ux-content > *').first().evaluate(el => el.tagName.toLowerCase());

    // Inject an external link (href starts with https) – handler must skip it
    await page.evaluate(() => {
      const a = document.createElement('a');
      a.id = 'ext-link';
      a.href = 'https://example.com';
      a.target = '_blank'; // realistic external link
      document.body.appendChild(a);
    });

    // Click without waiting for navigation (external links open a new tab / are no-ops in jsdom)
    await page.evaluate(() => {
      document.getElementById('ext-link')?.click();
    });

    // View must not have changed
    const afterView = await page.locator('#ux-content > *').first().evaluate(el => el.tagName.toLowerCase());
    expect(afterView).toBe(beforeView);
  });
});
