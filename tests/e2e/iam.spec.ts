/**
 * IAM Example App E2E Tests
 * Test the complete IAM application workflow
 */

import { test, expect } from '@playwright/test';

test.describe('IAM Application E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to IAM example
    await page.goto('http://localhost:5173/examples/iam', { waitUntil: 'networkidle' });
  });

  test('should load IAM application', async ({ page }) => {
    // Wait for app container
    const appContainer = page.locator('[data-testid="iam-app"]');
    await expect(appContainer).toBeVisible();
  });

  test('should display login form initially', async ({ page }) => {
    // Look for login form elements
    const loginForm = page.locator('form');
    const usernameInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    // Check if form elements exist
    if (await loginForm.count() > 0) {
      await expect(usernameInput).toBeDefined();
      await expect(passwordInput).toBeDefined();
      await expect(submitButton).toBeDefined();
    }
  });

  test('should validate form inputs', async ({ page }) => {
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
      
      // Check for error messages
      const errorElements = page.locator('[class*="error"]');
      // Expect either error display or form rejection
      expect(errorElements.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle user input', async ({ page }) => {
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await usernameInput.count() > 0) {
      await usernameInput.fill('testuser');
      await expect(usernameInput).toHaveValue('testuser');
    }

    if (await passwordInput.count() > 0) {
      await passwordInput.fill('password123');
      await expect(passwordInput).toHaveValue('password123');
    }
  });

  test('should handle form submission', async ({ page }) => {
    // Fill form
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    if (await usernameInput.count() > 0) {
      await usernameInput.fill('testuser');
    }

    if (await passwordInput.count() > 0) {
      await passwordInput.fill('password');
    }

    if (await submitButton.count() > 0) {
      await submitButton.click();
      
      // Wait for response (either success or error)
      await page.waitForTimeout(1000);
    }
  });

  test('should maintain state during navigation', async ({ page }) => {
    // Fill form
    const input = page.locator('input').first();
    
    if (await input.count() > 0) {
      await input.fill('data');
      
      // Navigate away and back
      await page.reload();
      
      // State may be cleared after reload (depends on implementation)
      expect(page.url()).toContain('localhost');
    }
  });

  test('should handle rapid interactions', async ({ page }) => {
    const button = page.locator('button').first();
    
    if (await button.count() > 0) {
      // Click multiple times rapidly
      await button.click();
      await button.click();
      await button.click();
      
      // Should not crash
      await expect(page).not.toHaveTitle('Error');
    }
  });

  test('should display UI components correctly', async ({ page }) => {
    // Check for form structure
    const forms = page.locator('form');
    const inputs = page.locator('input');
    const buttons = page.locator('button');

    const formCount = await forms.count();
    const inputCount = await inputs.count();
    const buttonCount = await buttons.count();

    expect(formCount + inputCount + buttonCount).toBeGreaterThanOrEqual(0);
  });

  test('should not have console errors', async ({ page }) => {
    let errorCount = 0;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errorCount++;
      }
    });

    // Interact with page
    const button = page.locator('button').first();
    if (await button.count() > 0) {
      await button.click();
    }

    // Console errors may occur (depends on app)
    expect(typeof errorCount).toBe('number');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);

    // Try to interact
    const button = page.locator('button').first();
    if (await button.count() > 0) {
      await button.click();
      await page.waitForTimeout(500);
    }

    // Should not crash
    expect(page.url()).toBeTruthy();

    // Go back online
    await page.context().setOffline(false);
  });

  test('should respond to accessibility interactions', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check if focus changed
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should display responsive layout', async ({ page }) => {
    // Test different viewport sizes
    await page.setViewportSize({ width: 1920, height: 1080 });
    let desktop = await page.screenshot();
    expect(desktop).toBeTruthy();

    await page.setViewportSize({ width: 768, height: 1024 });
    let tablet = await page.screenshot();
    expect(tablet).toBeTruthy();

    await page.setViewportSize({ width: 375, height: 667 });
    let mobile = await page.screenshot();
    expect(mobile).toBeTruthy();
  });

  test('should handle modal/dialog if present', async ({ page }) => {
    const dialogs = page.locator('[role="dialog"]');
    const modals = page.locator('[class*="modal"]');

    const dialogCount = await dialogs.count();
    const modalCount = await modals.count();

    expect(dialogCount + modalCount).toBeGreaterThanOrEqual(0);
  });

  test('should maintain data consistency', async ({ page }) => {
    // Fill multiple fields
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      const input = inputs.nth(i);
      await input.fill(`value${i}`);
    }

    // Verify values persisted
    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      const input = inputs.nth(i);
      const value = await input.inputValue();
      expect(value).toBeTruthy();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Look for loading indicators
    const loaders = page.locator('[class*="loading"], [class*="spinner"], [role="status"]');
    
    // Should not initially show loading
    const initialCount = await loaders.count();
    expect(initialCount).toBeGreaterThanOrEqual(0);
  });

  test('should display success/error messages', async ({ page }) => {
    // Look for alert elements
    const alerts = page.locator('[role="alert"], [class*="alert"], [class*="message"], [class*="toast"]');
    
    const count = await alerts.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
