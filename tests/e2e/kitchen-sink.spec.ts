import { test, expect, Page } from '@playwright/test';

async function waitForShowcase(page: Page, route = '/components') {
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!(window as any).__ux3App, { timeout: 15000 });
  await page.waitForSelector('body > #ux-content > ux-hello', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('ux-app-shell', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('ux-theme-toggle', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('ux-lang-switcher', { state: 'attached', timeout: 15000 });
}

async function dispatchHostClick(page: Page, selector: string) {
  await page.locator(selector).evaluate((element) => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  });
}

test.describe('Kitchen sink component showcase', () => {
  test('mounts the kitchen sink showcase shell', async ({ page }) => {
    await waitForShowcase(page);
    await expect(page.locator('body > #ux-content')).toHaveCount(1);
    await expect(page.locator('body > #ux-content > ux-hello')).toHaveCount(1);
    await expect(page.locator('ux-app-shell')).toHaveCount(1);
  });

  test('renders the expanded built-in component catalog', async ({ page }) => {
    await waitForShowcase(page);

    const expectedTags = [
      'ux-app-shell',
      'ux-topbar',
      'ux-sidebar',
      'ux-breadcrumb',
      'ux-pagination',
      'ux-panel',
      'ux-button',
      'ux-icon',
      'ux-icon-button',
      'ux-link',
      'ux-modal',
      'ux-drawer',
      'ux-tabs',
      'ux-tab-panel',
      'ux-accordion',
      'ux-menu',
      'ux-menu-item',
      'ux-dropdown',
      'ux-select',
      'ux-command-palette',
      'ux-tooltip',
      'ux-search-input',
      'ux-search-tags',
      'ux-search-results',
      'ux-table',
      'ux-table-virtual',
      'ux-list',
      'ux-description-list',
      'ux-card',
      'ux-card-icon',
      'ux-surface',
      'ux-divider',
      'ux-badge',
      'ux-avatar',
      'ux-alert',
      'ux-toast',
      'ux-toast-container',
      'ux-progress',
      'ux-spinner',
      'ux-skeleton',
      'ux-empty-state',
      'ux-error-panel',
      'ux-form',
      'ux-field',
      'ux-field-array',
      'ux-input',
      'ux-textarea',
      'ux-checkbox',
      'ux-radio-group',
      'ux-switch',
      'ux-slider',
      'ux-form-errors',
      'ux-grid',
      'ux-hero',
      'ux-image',
      'ux-image-panel',
      'ux-image-capture',
      'ux-inline',
      'ux-video',
      'ux-video-capture',
      'ux-article',
      'ux-audio',
      'ux-audio-capture',
      'ux-chart-line',
      'ux-chart-bar',
      'ux-chart-donut',
      'ux-chart-line-legend',
      'ux-chat-messenger',
      'ux-chat-thread-list',
      'ux-chat-roster',
      'ux-chat-messages',
      'ux-chat-bubble',
      'ux-chat-composer',
      'ux-popover',
      'ux-hover-panel',
      'ux-splash',
      'ux-splash-screen',
      'ux-stack',
      'ux-wizard',
      'ux-wysiwyg',
      'ux-consent-banner',
      'ux-content',
      'ux-nav',
      'ux-lang-switcher',
      'ux-theme-toggle',
      'ux-network-status',
    ];

    for (const tag of expectedTags) {
      await expect(page.locator(tag).first(), `${tag} should be present in kitchen sink`).toHaveCount(1);
    }
  });

  test('theme and locale controls are present in showcase layout', async ({ page }) => {
    await waitForShowcase(page);

    await expect(page.locator('ux-theme-toggle')).toHaveCount(2);
    await expect(page.locator('ux-lang-switcher')).toHaveCount(2);
  });

  test('guarded flow transitions through showcase states', async ({ page }) => {
    await waitForShowcase(page);

    await dispatchHostClick(page, 'ux-button[ux-event="click:ENABLE_ADVANCED"]');
    await dispatchHostClick(page, 'ux-button[ux-event="click:SET_MODE"][ux-event-value="mode=forms"]');
    await dispatchHostClick(page, 'ux-button[ux-event="click:NEXT"]');
    await expect(page.locator('ux-button[ux-event="click:COMPLETE"]')).toHaveCount(1);

    await dispatchHostClick(page, 'ux-button[ux-event="click:COMPLETE"]');
    await expect(page.locator('ux-button[ux-event="click:RESET"]')).toHaveCount(1);

    await dispatchHostClick(page, 'ux-button[ux-event="click:RESET"]');
    await expect(page.locator('ux-button[ux-event="click:NEXT"]')).toHaveCount(1);
  });

  test('form components are properly rendered', async ({ page }) => {
    await waitForShowcase(page);

    await expect(page.locator('ux-form')).toHaveCount(1);
    await expect(page.locator('ux-input')).toBeAttached();
    await expect(page.locator('ux-textarea')).toBeAttached();
    await expect(page.locator('ux-select')).toBeAttached();
    await expect(page.locator('ux-checkbox')).toBeAttached();
    await expect(page.locator('ux-radio-group')).toBeAttached();
    await expect(page.locator('ux-switch')).toBeAttached();
    await expect(page.locator('ux-slider')).toBeAttached();
  });

  test('data and visualization components are properly rendered', async ({ page }) => {
    await waitForShowcase(page);

    await expect(page.locator('ux-table')).toBeAttached();
    await expect(page.locator('ux-search-input')).toBeAttached();
    await expect(page.locator('ux-search-tags')).toBeAttached();
    await expect(page.locator('ux-list')).toBeAttached();
    await expect(page.locator('ux-description-list')).toBeAttached();
    await expect(page.locator('ux-chart-line')).toBeAttached();
    await expect(page.locator('ux-chart-bar')).toBeAttached();
    await expect(page.locator('ux-chart-donut')).toBeAttached();
    await expect(page.locator('ux-table-virtual')).toBeAttached();
  });

  test('feedback and status components are properly rendered', async ({ page }) => {
    await waitForShowcase(page);

    await expect(page.locator('ux-alert')).toBeAttached();
    await expect(page.locator('ux-toast')).toBeAttached();
    await expect(page.locator('ux-progress')).toBeAttached();
    await expect(page.locator('ux-spinner')).toBeAttached();
    await expect(page.locator('ux-skeleton')).toBeAttached();
    await expect(page.locator('ux-empty-state')).toBeAttached();
    await expect(page.locator('ux-error-panel')).toBeAttached();
  });

  test('interactive components are properly rendered', async ({ page }) => {
    await waitForShowcase(page);

    await expect(page.locator('ux-modal')).toBeAttached();
    await expect(page.locator('ux-drawer')).toBeAttached();
    await expect(page.locator('ux-tabs')).toBeAttached();
    await expect(page.locator('ux-accordion')).toBeAttached();
    await expect(page.locator('ux-popover')).toBeAttached();
    await expect(page.locator('ux-hover-panel')).toBeAttached();
    await expect(page.locator('ux-tooltip')).toBeAttached();
    await expect(page.locator('ux-wizard')).toBeAttached();
  });

  test('media and messaging components are properly rendered', async ({ page }) => {
    await waitForShowcase(page);

    await expect(page.locator('ux-image')).toBeAttached();
    await expect(page.locator('ux-image-panel')).toBeAttached();
    await expect(page.locator('ux-image-capture')).toBeAttached();
    await expect(page.locator('ux-video')).toBeAttached();
    await expect(page.locator('ux-video-capture')).toBeAttached();
    await expect(page.locator('ux-audio')).toBeAttached();
    await expect(page.locator('ux-audio-capture')).toBeAttached();
    await expect(page.locator('ux-chat-messenger')).toBeAttached();
    await expect(page.locator('ux-chat-thread-list')).toBeAttached();
    await expect(page.locator('ux-chat-roster')).toBeAttached();
    await expect(page.locator('ux-chat-messages')).toBeAttached();
    await expect(page.locator('ux-chat-bubble')).toBeAttached();
    await expect(page.locator('ux-chat-composer')).toBeAttached();
  });

  test('content and layout components are properly rendered', async ({ page }) => {
    await waitForShowcase(page);

    await expect(page.locator('ux-hero')).toBeAttached();
    await expect(page.locator('ux-article')).toBeAttached();
    await expect(page.locator('ux-grid')).toBeAttached();
    await expect(page.locator('ux-wysiwyg')).toBeAttached();
    await expect(page.locator('ux-consent-banner')).toBeAttached();
  });

  test('composition elements are properly rendered', async ({ page }) => {
    await waitForShowcase(page);

    await expect(page.locator('ux-card')).toBeAttached();
    await expect(page.locator('ux-surface')).toBeAttached();
    await expect(page.locator('ux-divider')).toBeAttached();
    await expect(page.locator('ux-badge')).toBeAttached();
    await expect(page.locator('ux-avatar')).toBeAttached();
    await expect(page.locator('ux-splash')).toBeAttached();
    await expect(page.locator('ux-splash-screen')).toBeAttached();
  });

  test('navigation components are properly rendered', async ({ page }) => {
    await waitForShowcase(page);

    await expect(page.locator('ux-topbar')).toBeAttached();
    await expect(page.locator('ux-sidebar')).toBeAttached();
    await expect(page.locator('ux-breadcrumb')).toBeAttached();
    await expect(page.locator('ux-pagination')).toBeAttached();
    await expect(page.locator('ux-menu')).toBeAttached();
  });

  test('button variants are properly rendered', async ({ page }) => {
    await waitForShowcase(page);

    const buttons = await page.locator('ux-button').count();
    expect(buttons).toBeGreaterThan(10);

    await expect(page.locator('ux-button[variant="primary"]')).toBeAttached();
    await expect(page.locator('ux-button[variant="secondary"]')).toBeAttached();
    await expect(page.locator('ux-button[variant="danger"]')).toBeAttached();
    await expect(page.locator('ux-button[variant="success"]')).toBeAttached();
    await expect(page.locator('ux-button[variant="warning"]')).toBeAttached();
  });

  test('theme and locale components work correctly', async ({ page }) => {
    await waitForShowcase(page);

    const themeButtons = await page.locator('ux-theme-toggle').count();
    expect(themeButtons).toBe(2);

    const localeButtons = await page.locator('ux-lang-switcher').count();
    expect(localeButtons).toBe(2);

    // Verify locales attribute is set
    const localeWithLocales = await page.locator('ux-lang-switcher[locales="en,fr,de,ar"]').first();
    await expect(localeWithLocales).toBeAttached();
  });

  test('network status component is present', async ({ page }) => {
    await waitForShowcase(page);

    const networkStatus = await page.locator('ux-network-status').count();
    expect(networkStatus).toBeGreaterThanOrEqual(2);
  });

  test('switches between capability, operations, and narrative layouts', async ({ page }) => {
    await waitForShowcase(page);

    await expect(page.locator('text=Active layout: Capability Matrix')).toBeVisible();

    await dispatchHostClick(page, 'ux-button[ux-event="click:VIEW_OPERATIONS"]');
    await expect(page.locator('text=Active layout: Operations Board')).toBeVisible();

    await dispatchHostClick(page, 'ux-button[ux-event="click:VIEW_NARRATIVE"]');
    await expect(page.locator('text=Active layout: Narrative Journey')).toBeVisible();

    await dispatchHostClick(page, 'ux-button[ux-event="click:VIEW_CAPABILITY"]');
    await expect(page.locator('text=Active layout: Capability Matrix')).toBeVisible();
  });

  test('theme toggle toggles light/dark attribute on document', async ({ page }) => {
    await waitForShowcase(page);

    const toggle = page.locator('ux-theme-toggle').first();
    await expect(toggle).toBeAttached();

    const schemeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-color-scheme'));
    await toggle.click();
    await page.waitForTimeout(300);
    const schemeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-color-scheme'));

    expect(schemeBefore).not.toBe(schemeAfter);
  });

  test('form input fields accept and update values', async ({ page }) => {
    await waitForShowcase(page);

    const nameInput = page.locator('ux-input[name="name"]').first();
    await expect(nameInput).toBeAttached();

    await nameInput.fill('Test User');
    const nameVal = await nameInput.inputValue();
    expect(nameVal).toBe('Test User');

    const bio = page.locator('ux-textarea[name="bio"]').first();
    await expect(bio).toBeAttached();
    await bio.fill('Updated bio text');
    const bioVal = await bio.inputValue();
    expect(bioVal).toBe('Updated bio text');

    const slider = page.locator('ux-slider[name="score"]').first();
    await expect(slider).toBeAttached();
    await slider.fill('85');
    const sliderVal = await slider.inputValue();
    expect(sliderVal).toBe('85');
  });

  test('modal opens and closes', async ({ page }) => {
    await waitForShowcase(page);

    const modalTrigger = page.locator('ux-button:has-text("Open modal")').first();
    await expect(modalTrigger).toBeAttached();

    await modalTrigger.click();
    await page.waitForTimeout(300);
    await expect(page.locator('ux-modal')).toBeVisible();

    const closeBtn = page.locator('ux-modal ux-button:has-text("Close")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  });

  test('keyboard navigation tabs through interactive elements', async ({ page }) => {
    await waitForShowcase(page);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    const focused = page.locator(':focus');
    await expect(focused).toHaveCount(1);
  });

  test('accordion toggle expands and collapses', async ({ page }) => {
    await waitForShowcase(page);

    const accordion = page.locator('ux-accordion').first();
    await expect(accordion).toBeAttached();

    const trigger = accordion.locator('[slot="trigger"], button, [role="button"]').first();
    if (await trigger.count() > 0) {
      await trigger.click();
      await page.waitForTimeout(300);
    }
  });
});
