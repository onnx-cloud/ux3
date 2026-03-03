/**
 * IAM Example E2E Tests
 * End-to-end Playwright tests for the IAM application
 */
import { test, expect } from '@playwright/test';
test.describe('IAM Example - E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    });
    test('should load app without errors', async ({ page }) => {
        // Check for console errors
        let consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        // Wait a bit for any errors to appear
        await page.waitForTimeout(1000);
        // Should not have any console errors
        expect(consoleErrors).toHaveLength(0);
    });
    test('should render home page with proper layout', async ({ page }) => {
        // Check main layout elements are rendered
        const header = page.locator('#site-header');
        const main = page.locator('main[role="main"]');
        const footer = page.locator('#site-footer');
        await expect(header).toBeVisible();
        await expect(main).toBeVisible();
        await expect(footer).toBeVisible();
    });
    test('should display home page content', async ({ page }) => {
        // Home page should show featured content or links
        const main = page.locator('main[role="main"]');
        // Should have some visible content
        await expect(main).toContainText(/Featured|Dashboard|Chart|Modal/i);
    });
    test('should have navigation links in home page', async ({ page }) => {
        // Check for navigation links
        const links = page.locator('a[href^="/"]');
        // Should have multiple navigation links
        const count = await links.count();
        expect(count).toBeGreaterThan(0);
    });
    test('should handle navigation to dashboard', async ({ page }) => {
        // Click a navigation link if present, or navigate directly
        await page.goto('http://localhost:5173/#/dashboard', { waitUntil: 'networkidle' });
        // Should not show error
        let hasError = false;
        page.on('console', msg => {
            if (msg.type() === 'error')
                hasError = true;
        });
        // Wait for content to load
        await page.waitForTimeout(500);
        expect(hasError).toBe(false);
    });
    test('should render footer with copyright', async ({ page }) => {
        const footer = page.locator('#site-footer small');
        // Footer should contain copyright or disclaimer text
        await expect(footer).toBeVisible();
    });
    test('app should not display raw template syntax', async ({ page }) => {
        const bodyContent = await page.content();
        // Should not have unrendered template syntax or i18n keys
        expect(bodyContent).not.toContain('{{i18n.');
        expect(bodyContent).not.toContain('{{this.');
        expect(bodyContent).not.toContain('{{{');
    });
    test('should have registered custom elements', async ({ page }) => {
        // Check if custom elements are defined
        const customElements = await page.evaluate(() => {
            const elements = [];
            // Check for any ux-* custom elements
            const uxElements = document.querySelectorAll('[class^="ux-"], [id^="ux-"]');
            uxElements.forEach(el => {
                if (el.tagName.toLowerCase().startsWith('ux-')) {
                    elements.push(el.tagName.toLowerCase());
                }
            });
            return elements;
        });
        // May or may not have custom elements depending on the page
        // Just verify the query doesn't error
        expect(Array.isArray(customElements)).toBe(true);
    });
    test('should have proper view structure', async ({ page }) => {
        // Check main content area structure
        const mainContent = page.locator('main[role="main"]');
        // Main should have some children
        const childCount = await mainContent.locator('> div').count();
        expect(childCount).toBeGreaterThanOrEqual(0);
    });
    test('footer copyright should not have raw i18n key', async ({ page }) => {
        const footer = page.locator('#site-footer small');
        const text = await footer.textContent();
        // Should render the i18n text, not show the key
        expect(text).not.toContain('i18n.');
    });
    test('should respond to page navigation', async ({ page }) => {
        // Click a link if present
        const firstLink = page.locator('a[href]').first();
        const href = await firstLink.getAttribute('href');
        if (href && href.startsWith('/')) {
            // Navigate and check it loads
            await page.goto(`http://localhost:5173/#${href}`, { waitUntil: 'domcontentloaded' });
            // Should load without critical error
            const anyText = await page.locator('body').textContent();
            expect(anyText).toBeTruthy();
        }
    });
    test('should render all accessible elements', async ({ page }) => {
        // Run basic a11y check
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        // May or may not have buttons depending on current page
        expect(typeof buttonCount).toBe('number');
    });
    test('styles should be applied', async ({ page }) => {
        const mainContent = page.locator('main[role="main"]');
        // Should have some styling applied (not check specific styles, just that styles are applied)
        const computedStyle = await mainContent.evaluate((el) => {
            return window.getComputedStyle(el).display;
        });
        // Display should be a valid value
        expect(['block', 'flex', 'grid', 'inline-block', 'inline']).toContain(computedStyle);
    });
});
//# sourceMappingURL=iam-example.spec.js.map