/**
 * E2E Test Utilities
 * Helper functions and fixtures for testing the UX3 framework
 */
import { test as base, expect } from '@playwright/test';
/**
 * Custom test fixture that provides an authenticated page
 * Useful for tests that require user to be logged in
 */
export const test = base.extend({
    authenticatedPage: async ({ page }, use) => {
        // Navigate to login page
        await page.goto('/');
        // Check if already logged in
        const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);
        if (!isLoggedIn) {
            // Perform login
            await page.fill('input[type="email"]', 'test@example.com');
            await page.fill('input[type="password"]', 'password123');
            await page.click('button:has-text("Login")');
            // Wait for navigation or loading to complete
            await page.waitForLoadState('networkidle');
        }
        await use(page);
        // Cleanup - logout
        await page.click('[data-testid="user-menu"]');
        await page.click('[data-testid="logout-button"]').catch(() => { });
    },
});
/**
 * Helper to wait for FSM state change
 */
export async function waitForFSMState(page, expectedState, timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const state = await page.evaluate(() => {
            return window.__ux3App?.machines?.[Object.keys(window.__ux3App?.machines || {})[0]]?.getState?.();
        });
        if (state === expectedState) {
            return true;
        }
        await page.waitForTimeout(100);
    }
    throw new Error(`FSM state did not reach "${expectedState}" within ${timeout}ms`);
}
/**
 * Helper to wait for i18n translation to be available
 */
export async function waitForI18n(page, key, timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const text = await page.evaluate((k) => {
            return window.__ux3App?.i18n?.(k);
        }, key);
        if (text && text !== key) {
            return text;
        }
        await page.waitForTimeout(100);
    }
    throw new Error(`i18n key "${key}" not available within ${timeout}ms`);
}
/**
 * Helper to get FSM context
 */
export async function getFSMContext(page, fsmId) {
    return page.evaluate((id) => {
        return window.__ux3App?.machines?.[id]?.getContext?.();
    }, fsmId);
}
/**
 * Helper to send FSM event
 */
export async function sendFSMEvent(page, fsmId, event) {
    return page.evaluate(([id, evt]) => {
        window.__ux3App?.machines?.[id]?.send?.(evt);
    }, [fsmId, event]);
}
/**
 * Helper to check if element has class
 */
export async function hasClass(element, className) {
    const classes = await element.getAttribute('class');
    return classes?.includes(className) ?? false;
}
/**
 * Helper to fill and validate form
 */
export async function fillForm(page, formData) {
    for (const [selector, value] of Object.entries(formData)) {
        const element = page.locator(selector);
        // Wait for element to be visible
        await element.waitFor({ state: 'visible' });
        // Fill the element
        await element.fill(value);
    }
}
/**
 * Helper to check accessibility
 */
export async function checkAccessibility(page) {
    // Check for ARIA labels
    const elementsWithoutLabels = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        return Array.from(buttons)
            .filter((btn) => !btn.getAttribute('aria-label') && !btn.textContent?.trim())
            .map((btn) => btn.outerHTML);
    });
    if (elementsWithoutLabels.length > 0) {
        throw new Error(`Found ${elementsWithoutLabels.length} buttons without labels`);
    }
}
/**
 * Helper to test error state
 */
export async function testErrorHandling(page, triggerError) {
    // Trigger error
    await triggerError();
    // Check for error message
    const errorElement = page.locator('[data-testid="error-message"]');
    await expect(errorElement).toBeVisible();
    // Check for error styling
    const errorContainer = page.locator('[data-testid="error-container"]');
    const hasErrorClass = await hasClass(errorContainer, 'error');
    expect(hasErrorClass).toBe(true);
}
/**
 * Helper to take screenshot with consistent naming
 */
export async function takeNamedScreenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ path: `screenshots/${name}-${timestamp}.png` });
}
/**
 * Helper for performance testing
 */
export async function measurePerformance(page, action) {
    const startTime = await page.evaluate(() => performance.now());
    await action();
    const endTime = await page.evaluate(() => performance.now());
    const duration = endTime - startTime;
    return {
        duration,
        isAcceptable: duration < 3000, // 3 second threshold
    };
}
/**
 * Re-export expect for convenience
 */
export { expect };
//# sourceMappingURL=utils.js.map