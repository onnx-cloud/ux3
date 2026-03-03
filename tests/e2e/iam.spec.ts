/**
 * IAM Example App E2E Tests
 *
 * Focused on concrete, observable behaviour rather than "if element exists"
 * soft-guards.  Every test makes a meaningful assertion that would fail when
 * a real regression occurs.
 */

import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function waitForApp(page: Page, timeout = 12000) {
  await page.waitForFunction(() => !!(window as any).__ux3App, { timeout });
}

// ---------------------------------------------------------------------------
// App boot
// ---------------------------------------------------------------------------

test.describe('IAM app boot', () => {
  test('page title is set from site config', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    const title = await page.title();
    // IAM ux3.yaml: title: "Invest America"
    expect(title).toContain('Invest America');
  });

  test('#ux-content mount point is present in the DOM', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#ux-content')).toHaveCount(1);
  });

  test('a view element is mounted into #ux-content after hydration', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const count = await page.locator('#ux-content > *').count();
    expect(count).toBeGreaterThan(0);

    const tag = await page.locator('#ux-content > *').first().evaluate(el => el.tagName.toLowerCase());
    expect(tag).toMatch(/^ux-/);
  });

  test('inspector is enabled and window.__ux3Inspector is set', async ({ page }) => {
    // IAM ux3.yaml: development.inspector: true
    await page.goto('/');
    await waitForApp(page);

    const hasInspector = await page.evaluate(() => !!(window as any).__ux3Inspector);
    expect(hasInspector).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Login view
// ---------------------------------------------------------------------------

test.describe('Login view (/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);
  });

  test('<ux-login> is mounted in #ux-content', async ({ page }) => {
    await expect(page.locator('#ux-content > ux-login')).toHaveCount(1);
  });

  test('login idle state template is rendered', async ({ page }) => {
    // Template: <div ux-state="login.idle"> … </div>
    await expect(page.locator('[ux-state="login.idle"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('a SUBMIT button is present in the idle state', async ({ page }) => {
    await page.waitForSelector('[ux-state="login.idle"]', { timeout: 5000 });
    const btn = page.locator('[ux-state="login.idle"] button[ux-event="SUBMIT"]');
    await expect(btn).toHaveCount(1);
  });

  test('clicking SUBMIT transitions FSM out of idle state', async ({ page }) => {
    await page.waitForSelector('[ux-state="login.idle"]', { timeout: 5000 });
    await page.click('[ux-state="login.idle"] button[ux-event="SUBMIT"]');

    // After SUBMIT the view should transition away from idle
    await page.waitForFunction(() => {
      return !document.querySelector('[ux-state="login.idle"]');
    }, { timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Sign-up view
// ---------------------------------------------------------------------------

test.describe('Sign-up view (/sign-up)', () => {
  test('<ux-sign-up> is mounted in #ux-content', async ({ page }) => {
    await page.goto('/sign-up');
    await waitForApp(page);

    await expect(page.locator('#ux-content > ux-sign-up')).toHaveCount(1);
  });

  test('sign-up idle state template is rendered', async ({ page }) => {
    await page.goto('/sign-up');
    await waitForApp(page);

    await expect(page.locator('[ux-state="sign-up.idle"]')).toHaveCount(1, { timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// SPA transitions
// ---------------------------------------------------------------------------

test.describe('SPA transitions', () => {
  test('navigating from / to /login swaps the view without a page reload', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.evaluate(() => {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await expect(page.locator('#ux-content > ux-login')).toHaveCount(1, { timeout: 5000 });
    expect(new URL(page.url()).pathname).toBe('/login');
  });

  test('navigating from /login to /sign-up via injected link', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    await page.evaluate(() => {
      const a = document.createElement('a');
      a.id = 'iam-test-link';
      a.href = '/sign-up';
      document.body.appendChild(a);
    });
    await page.click('#iam-test-link');

    await expect(page.locator('#ux-content > ux-sign-up')).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('#ux-content > ux-login')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Accessibility basics
// ---------------------------------------------------------------------------

test.describe('Accessibility', () => {
  test('keyboard Tab reaches a focusable element', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);
    await page.waitForSelector('[ux-state="login.idle"]', { timeout: 5000 });

    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
    expect(focused).toBeTruthy();
    expect(focused).not.toBe('body');
  });

  test('page has a landmark element for screen readers', async ({ page }) => {
    await page.goto('/');
    const landmark = await page.locator('main, [role="main"], #ux-content').count();
    expect(landmark).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Error resilience
// ---------------------------------------------------------------------------

test.describe('Error resilience', () => {
  test('offline mode does not crash the page', async ({ page }) => {
    await page.goto('/login');
    await waitForApp(page);

    await page.context().setOffline(true);

    await page.evaluate(() => {
      window.history.pushState({}, '', '/sign-up');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await expect(page.locator('#ux-content')).toHaveCount(1);
    await page.context().setOffline(false);
  });

  test('rapid SUBMIT clicks do not throw unhandled errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/login');
    await waitForApp(page);
    await page.waitForSelector('[ux-state="login.idle"] button[ux-event="SUBMIT"]', { timeout: 5000 });

    const btn = page.locator('[ux-state="login.idle"] button[ux-event="SUBMIT"]').first();
    for (let i = 0; i < 5; i++) {
      await btn.click({ force: true }).catch(() => {});
    }

    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});
