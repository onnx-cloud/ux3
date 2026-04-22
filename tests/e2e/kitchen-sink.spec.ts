import { test, expect, Page } from '@playwright/test';

async function waitForShowcase(page: Page, route = '/components') {
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!(window as any).__ux3App, { timeout: 15000 });
  await page.waitForSelector('body > #ux-content > ux-hello', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('ux-app-shell', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('ux-dropdown', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('ux-theme', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('ux-locale', { state: 'attached', timeout: 15000 });
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
      'ux-topbar',
      'ux-sidebar',
      'ux-breadcrumb',
      'ux-pagination',
      'ux-button',
      'ux-icon-button',
      'ux-link',
      'ux-modal',
      'ux-drawer',
      'ux-tabs',
      'ux-tab-panel',
      'ux-accordion',
      'ux-menu',
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
      'ux-surface',
      'ux-divider',
      'ux-badge',
      'ux-avatar',
      'ux-alert',
      'ux-toast',
      'ux-progress',
      'ux-spinner',
      'ux-skeleton',
      'ux-empty-state',
      'ux-error-panel',
      'ux-form',
      'ux-field',
      'ux-input',
      'ux-textarea',
      'ux-checkbox',
      'ux-radio-group',
      'ux-switch',
      'ux-slider',
      'ux-form-errors',
      'ux-image',
      'ux-image-panel',
      'ux-image-capture',
      'ux-video',
      'ux-video-capture',
      'ux-audio',
      'ux-audio-capture',
      'ux-chart-line',
      'ux-chart-bar',
      'ux-chart-donut',
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
      'ux-wizard',
      'ux-wysiwyg',
      'ux-consent-banner',
      'ux-locale',
      'ux-theme',
      'ux-network-status',
    ];

    for (const tag of expectedTags) {
      await expect(page.locator(tag).first(), `${tag} should be present in kitchen sink`).toHaveCount(1);
    }
  });

  test('theme and locale controls are present in showcase layout', async ({ page }) => {
    await waitForShowcase(page);

    await expect(page.locator('ux-theme')).toHaveCount(2);
    await expect(page.locator('ux-locale')).toHaveCount(2);

    await expect(page.locator('ux-theme[persist="false"]')).toHaveCount(2);
    await expect(page.locator('ux-locale[persist="false"]')).toHaveCount(2);
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

    const themeButtons = await page.locator('ux-theme[persist="false"]').count();
    expect(themeButtons).toBe(2);

    const localeButtons = await page.locator('ux-locale[persist="false"]').count();
    expect(localeButtons).toBe(2);

    // Verify locales attribute is set
    const localeWithLocales = await page.locator('ux-locale[locales="en,fr,de,ar"]').first();
    await expect(localeWithLocales).toBeAttached();
  });

  test('network status component is present', async ({ page }) => {
    await waitForShowcase(page);

    const networkStatus = await page.locator('ux-network-status').count();
    expect(networkStatus).toBeGreaterThanOrEqual(2);
  });

  test('switches between capability, operations, and narrative layouts', async ({ page }) => {
    await waitForShowcase(page);

    await expect(page.locator('text=Active layout: capability')).toBeVisible();
    await expect(page.locator('text=Capability Matrix')).toBeVisible();

    await dispatchHostClick(page, 'ux-button[ux-event="click:SET_LAYOUT"][ux-event-value="layout=operations"]');
    await expect(page.locator('text=Active layout: operations')).toBeVisible();
    await expect(page.locator('text=Operations board is healthy')).toBeVisible();

    await dispatchHostClick(page, 'ux-button[ux-event="click:SET_LAYOUT"][ux-event-value="layout=narrative"]');
    await expect(page.locator('text=Active layout: narrative')).toBeVisible();
    await expect(page.locator('text=Narrative Journey')).toBeVisible();
  });
});
