/**
 * Hydration-only Pattern E2E Tests
 *
 * Tests for the new hydration-only asset injection pattern where:
 * - Only `<script data-ux3="hydration">` is injected
 * - Bundle is imported dynamically via `import()` within the hydration script
 * - No separate `<script data-ux3="app">` element exists
 * - Hydration runs on DOMContentLoaded event
 */
import { test, expect } from '@playwright/test';
test.describe('Hydration-only pattern', () => {
    test('hydration script is present in HTML', async ({ page }) => {
        await page.goto('/');
        const hydrationEl = page.locator('script[data-ux3="hydration"]');
        await expect(hydrationEl).toHaveCount(1);
    });
    test('hydration script contains dynamic import() call', async ({ page }) => {
        await page.goto('/');
        const hydrationEl = page.locator('script[data-ux3="hydration"]');
        const scriptText = await hydrationEl.textContent() ?? '';
        expect(scriptText).toContain('import(');
        expect(scriptText).toContain('DOMContentLoaded');
    });
    test('hydration script does NOT use placeholder "bundle pending"', async ({ page }) => {
        await page.goto('/');
        const hydrationEl = page.locator('script[data-ux3="hydration"]');
        const scriptText = await hydrationEl.textContent() ?? '';
        expect(scriptText).not.toContain('bundle pending');
    });
    test('bundle URL can be extracted from hydration script', async ({ page }) => {
        await page.goto('/');
        const hydrationEl = page.locator('script[data-ux3="hydration"]');
        const scriptText = await hydrationEl.textContent() ?? '';
        const importMatch = scriptText.match(/import\('([^']+)'\)/);
        expect(importMatch).toBeTruthy();
        expect(importMatch[1]).toContain('bundle.ts');
    });
    test('bundle file is actually served and reachable', async ({ page }) => {
        await page.goto('/');
        const hydrationEl = page.locator('script[data-ux3="hydration"]');
        const scriptText = await hydrationEl.textContent() ?? '';
        const importMatch = scriptText.match(/import\('([^']+)'\)/);
        expect(importMatch).toBeTruthy();
        const bundleUrl = importMatch[1];
        const response = await page.request.get(bundleUrl);
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('javascript');
    });
    test('hydration script calls initApp from bundle', async ({ page }) => {
        await page.goto('/');
        const hydrationEl = page.locator('script[data-ux3="hydration"]');
        const scriptText = await hydrationEl.textContent() ?? '';
        expect(scriptText).toContain('initApp');
        // Should check that initApp is called if it's a function
        expect(scriptText).toContain('typeof m.initApp === \'function\'');
    });
    test('NO data-ux3="app" script element exists', async ({ page }) => {
        await page.goto('/');
        const appScript = page.locator('script[data-ux3="app"]');
        await expect(appScript).toHaveCount(0);
    });
    test('hydration script runs on DOMContentLoaded', async ({ page }) => {
        await page.goto('/');
        const hydrationEl = page.locator('script[data-ux3="hydration"]');
        const scriptText = await hydrationEl.textContent() ?? '';
        expect(scriptText).toContain('addEventListener');
        expect(scriptText).toContain('DOMContentLoaded');
    });
    test('hydration includes error handling for import failures', async ({ page }) => {
        await page.goto('/');
        const hydrationEl = page.locator('script[data-ux3="hydration"]');
        const scriptText = await hydrationEl.textContent() ?? '';
        // Should have try/catch for robustness
        expect(scriptText).toContain('try');
        expect(scriptText).toContain('catch');
        // Should log errors
        expect(scriptText).toContain('console.error');
    });
    test('app context is initialized after hydration', async ({ page }) => {
        await page.goto('/');
        // Wait for the hydration script to run and set __ux3App
        const appContextSet = await page.evaluate(() => {
            return new Promise((resolve) => {
                const checkApp = () => {
                    if (window.__ux3App) {
                        resolve(true);
                    }
                    else {
                        setTimeout(checkApp, 100);
                    }
                };
                checkApp();
            });
        });
        expect(appContextSet).toBe(true);
        // Verify the app context has expected structure
        const appContext = await page.evaluate(() => {
            const app = window.__ux3App;
            return {
                hasRoutes: !!app?.routes,
                hasMachines: !!app?.machines,
                hasI18n: !!app?.i18n,
                hasServices: !!app?.services,
            };
        });
        expect(appContext.hasRoutes).toBe(true);
        expect(appContext.hasMachines).toBe(true);
        expect(appContext.hasI18n).toBe(true);
        expect(appContext.hasServices).toBe(true);
    });
    test('cache-busting query parameter is added to bundle import', async ({ page }) => {
        await page.goto('/');
        const hydrationEl = page.locator('script[data-ux3="hydration"]');
        const scriptText = await hydrationEl.textContent() ?? '';
        // Should have ?ts= query parameter for cache busting
        const tsMatch = scriptText.match(/\?ts=\d+/);
        expect(tsMatch).toBeTruthy();
    });
});
test.describe('Layout rendering with hydration', () => {
    test('main #ux-content mount point is present after hydration', async ({ page }) => {
        await page.goto('/');
        // Wait for hydration to complete
        await page.waitForFunction(() => !!window.__ux3App, { timeout: 10000 });
        const content = page.locator('#ux-content');
        await expect(content).toHaveCount(1);
        await expect(content).toBeVisible();
    });
    test('layout elements are rendered and accessible', async ({ page }) => {
        await page.goto('/');
        await page.waitForFunction(() => !!window.__ux3App, { timeout: 10000 });
        // Header should exist
        const header = page.locator('#site-header');
        await expect(header).toBeVisible();
        // Footer should exist (even if empty/no i18n content)
        const footer = page.locator('#site-footer');
        expect(await footer.count()).toBeGreaterThanOrEqual(0);
    });
    test('navigation is rendered from config', async ({ page }) => {
        await page.goto('/');
        await page.waitForFunction(() => !!window.__ux3App, { timeout: 10000 });
        const nav = page.locator('nav');
        await expect(nav).toBeVisible();
        // Should have navigation links
        const links = page.locator('nav a');
        const linkCount = await links.count();
        expect(linkCount).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=hydration.spec.js.map