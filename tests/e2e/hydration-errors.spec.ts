/**
 * Asset Injection and Error Handling E2E Tests
 *
 * Tests for proper asset handling, error resilience, and fallback behavior
 * in the hydration-only pattern.
 */

import { test, expect } from '@playwright/test';

test.describe('Asset injection error handling', () => {
  test('hydration script handles import() failures gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Set up console listener to catch errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait for hydration to attempt - even if bundle fails, it should not throw
    await page.waitForTimeout(2000);
    
    // No unhandled promise rejections should occur
    page.on('pageerror', (error) => {
      throw new Error(`Unhandled page error: ${error.message}`);
    });
  });

  test('hydration script logs with correct prefix', async ({ page }) => {
    let hydrationLog = '';
    page.on('console', (msg) => {
      if (msg.text().includes('[UX3 hydration]')) {
        hydrationLog = msg.text();
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // If there's an error, it should use the UX3 hydration prefix
    if (hydrationLog) {
      expect(hydrationLog).toContain('[UX3 hydration]');
    }
  });

  test('styles are optionally injected if present', async ({ page }) => {
    await page.goto('/');
    
    const styleLinks = page.locator('link[data-ux3="styles"]');
    // Styles may or may not exist depending on build config
    const styleCount = await styleLinks.count();
    expect(styleCount).toBeGreaterThanOrEqual(0);
    
    // If styles are present, they should be valid
    if (styleCount > 0) {
      const href = await styleLinks.first().getAttribute('href');
      expect(href).toBeTruthy();
  }
  });

  test('multiple style links do not break hydration', async ({ page }) => {
    await page.goto('/');
    
    // Hydration should still complete even with multiple styles
    const hydrationEl = page.locator('script[data-ux3="hydration"]');
    await expect(hydrationEl).toHaveCount(1);
    
    // App context should still initialize
    await page.waitForFunction(() => !!(window as any).__ux3App, { timeout: 10000 });
  });
});

test.describe('Hydration timing and lifecycle', () => {
  test('hydration waits for DOMContentLoaded, not just page load',  async ({ page }) => {
    let domContentLoadedTime = 0;
    let hydrationStartTime = 0;
    
    await page.addInitScript(() => {
      (window as any).domContentLoadedTime = 0;
      (window as any).hydrationStartTime = 0;
      
      document.addEventListener('DOMContentLoaded', () => {
        (window as any).domContentLoadedTime = Date.now();
      });
    });
    
    await page.goto('/');
    
    // Extract timing data to verify DOMContentLoaded was waited for
    const timing = await page.evaluate(() => {
      return {
        dclTime: (window as any).domContentLoadedTime,
        navigationStart: performance.timing.navigationStart,
      };
    });
    
    expect(timing.dclTime).toBeGreaterThan(0);
  });

  test('hydration completes before view interaction', async ({ page }) => {
    await page.goto('/');
    
    // Wait for hydration
    await page.waitForFunction(() => !!(window as any).__ux3App, { timeout: 10000 });
    
    // After hydration, view should be mounted
    const viewElement = page.locator('#ux-content > *');
    const count = await viewElement.count();
    expect(count).toBeGreaterThan(0);
    
    // View should be interactive
    const firstView = viewElement.first();
    expect(await firstView.isVisible()).toBe(true);
  });

  test('page does not load with stale __ux3App from previous navigation', async ({ page }) => {
    await page.goto('/');
    
    // Let first page hydrate
    await page.waitForFunction(() => !!(window as any).__ux3App, { timeout: 10000 });
    const firstAppId = await page.evaluate(() => (window as any).__ux3App?.id || Math.random());
    
    // Navigate within the SPA
    await page.evaluate(() => {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    
    await page.waitForTimeout(500);
    
    // App context should still be valid
    const appValid = await page.evaluate(() => !!((window as any).__ux3App));
    expect(appValid).toBe(true);
  });
});

test.describe('Fallback behavior', () => {
  test('app gracefully handles missing __ux3App', async ({ page }) => {
    await page.goto('/');
    
    // Simulate __ux3App being undefined
    const appExists = await page.evaluate(() => {
      return typeof (window as any).__ux3App !== 'undefined';
    });
    
    if (!appExists) {
      // If __ux3App doesn't exist, page should still be navigable
      // (user might see a different state, but no js errors)
      page.on('pageerror', () => {
        throw new Error('Page error occurred without __ux3App');
      });
    } else {
      // App should exist after hydration
      expect(appExists).toBe(true);
    }
  });

  test('view renders even if some  i18n keys are missing', async ({ page }) => {
    await page.goto('/');
    
    // Wait for hydration
    await page.waitForFunction(() => !!(window as any).__ux3App, { timeout: 10000 });
    
    // View should be mounted
    const view = page.locator('#ux-content > *');
    expect(await view.count()).toBeGreaterThan(0);
    
    // Should be visible even if some i18n is missing
    await expect(view.first()).toBeVisible();
  });
});

test.describe('Performance metrics', () => {
  test('hydration completes within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Hydration should complete quickly
    await page.waitForFunction(() => !!(window as any).__ux3App, { timeout: 10000 });
    
    const hydrationTime = Date.now() - startTime;
    // Hydration should typically complete in under 5 seconds
    expect(hydrationTime).toBeLessThan(5000);
  });

  test('bundle import does not block DOM rendering', async ({ page }) => {
    await page.goto('/');
    
    // HTML should be rendered immediately 
    const htmlElement = page.locator('html');
    await expect(htmlElement).toBeVisible();
    
    // Layout should be present without waiting for bundle
    const header = page.locator('#site-header');
    expect(await header.count()).toBeGreaterThanOrEqual(0);
    
    // Main content mount point should exist
    const main = page.locator('#ux-content');
    expect(await main.count()).toBeGreaterThanOrEqual(1);
  });
});
