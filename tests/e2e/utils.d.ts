/**
 * E2E Test Utilities
 * Helper functions and fixtures for testing the UX3 framework
 */
import { Page, expect } from '@playwright/test';
interface TestFixtures {
    authenticatedPage: Page;
}
/**
 * Custom test fixture that provides an authenticated page
 * Useful for tests that require user to be logged in
 */
export declare const test: import("playwright/test").TestType<import("playwright/test").PlaywrightTestArgs & import("playwright/test").PlaywrightTestOptions & TestFixtures, import("playwright/test").PlaywrightWorkerArgs & import("playwright/test").PlaywrightWorkerOptions>;
/**
 * Helper to wait for FSM state change
 */
export declare function waitForFSMState(page: Page, expectedState: string, timeout?: number): Promise<boolean>;
/**
 * Helper to wait for i18n translation to be available
 */
export declare function waitForI18n(page: Page, key: string, timeout?: number): Promise<any>;
/**
 * Helper to get FSM context
 */
export declare function getFSMContext(page: Page, fsmId: string): Promise<any>;
/**
 * Helper to send FSM event
 */
export declare function sendFSMEvent(page: Page, fsmId: string, event: any): Promise<void>;
/**
 * Helper to check if element has class
 */
export declare function hasClass(element: any, className: string): Promise<boolean>;
/**
 * Helper to fill and validate form
 */
export declare function fillForm(page: Page, formData: Record<string, string>): Promise<void>;
/**
 * Helper to check accessibility
 */
export declare function checkAccessibility(page: Page): Promise<void>;
/**
 * Helper to test error state
 */
export declare function testErrorHandling(page: Page, triggerError: () => Promise<void>): Promise<void>;
/**
 * Helper to take screenshot with consistent naming
 */
export declare function takeNamedScreenshot(page: Page, name: string): Promise<void>;
/**
 * Helper for performance testing
 */
export declare function measurePerformance(page: Page, action: () => Promise<void>): Promise<{
    duration: number;
    isAcceptable: boolean;
}>;
/**
 * Re-export expect for convenience
 */
export { expect };
//# sourceMappingURL=utils.d.ts.map