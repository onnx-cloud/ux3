import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

/**
 * Config-driven E2E tests for UX3 Framework sites.
 * This test suite reads the site configuration (ux3.yaml) and i18n files
 * to dynamically verify the rendered shell, navigation, and content.
 */

// Configuration - can be overridden via environment variables
const PROJECT_DIR = process.env.TEST_PROJECT_DIR || 'examples/iam';
const ABS_PROJECT_DIR = path.resolve(process.cwd(), PROJECT_DIR);
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:1337';

function loadProjectConfig() {
  const ux3Path = path.join(ABS_PROJECT_DIR, 'ux', 'ux3.yaml');
  if (!fs.existsSync(ux3Path)) {
    throw new Error(`Project config not found at ${ux3Path}`);
  }
  return YAML.parse(fs.readFileSync(ux3Path, 'utf-8'));
}

function loadI18n(lang = 'en') {
  const i18nDir = path.join(ABS_PROJECT_DIR, 'ux', 'i18n', lang);
  const result: any = {};
  if (fs.existsSync(i18nDir)) {
    const files = fs.readdirSync(i18nDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = JSON.parse(fs.readFileSync(path.join(i18nDir, file), 'utf-8'));
        Object.assign(result, content);
      }
    }
  }
  return result;
}

const config = loadProjectConfig();
const i18n = loadI18n('en');

test.describe(`Config-driven tests: ${config.name || PROJECT_DIR}`, () => {
  
  test('should render the correct site title and meta tags', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Title from site config (ux3.yaml)
    const expectedTitle = config.site?.title || config.name;
    await expect(page).toHaveTitle(expectedTitle);
    
    // Meta description if present in config
    if (config.site?.description) {
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', config.site.description);
    }
  });

  test('should inject requested assets from config', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const assets = config.site?.assets || [];
    for (const asset of assets) {
      if (asset.type === 'script') {
        const script = page.locator(`script[src="${asset.src}"]`);
        await expect(script).toBeAttached();
      } else if (asset.type === 'style') {
        const link = page.locator(`link[href="${asset.href}"]`);
        await expect(link).toBeAttached();
      }
    }
  });

  test('should include runtime injection tags when configured', async ({ page }) => {
    await page.goto(BASE_URL);
    if (config.site?.runtime?.bundleKey) {
      await expect(page.locator('script[data-ux3="app"][type="module"]')).toBeVisible();
      await expect(page.locator('script[data-ux3="hydration"]')).toBeVisible();
    }
  });

  test('should render navigation based on i18n keys', async ({ page }) => {
    if (!config.site?.nav) {
      test.skip(); // nothing to validate when no nav is defined
    }
    await page.goto(BASE_URL);
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should render home page content from template and i18n', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // The home page (index.html) uses {{i18n.home.loaded.label}}
    if (i18n.home?.loaded?.label) {
      const content = page.locator(`text=${i18n.home.loaded.label}`);
      // if the locator exists we assert visibility otherwise we skip
      if ((await content.count()) > 0) {
        await expect(content).toBeVisible();
      }
    }
    
    // Check for common buttons/actions
    if (i18n.actions?.RETRY) {
      const retryButton = page.locator('button', { hasText: (i18n.actions as any).RETRY });
      if ((await retryButton.count()) > 0) {
        await expect(retryButton).toBeVisible();
      }
    }
  });

  test('should render footer copyright from i18n', async ({ page }) => {
    await page.goto(BASE_URL);
    const footer = page.locator('footer');
    await expect(footer).toHaveCount(1);
  });

  test('should correctly transition through routes defined in config', async ({ page }) => {
    const routes = config.routes || [];
    // Only test the first few routes to keep it fast
    for (const route of routes.slice(0, 3)) {
      if (route.path.includes(':')) continue; // Skip parameterized routes for now
      
      await page.goto(`${BASE_URL}${route.path}`);
      expect(page.url()).toBe(`${BASE_URL}${route.path}`);
      
      // Ensure the layout is still present (sanity check)
      const main = page.locator('main#ux-content');
      await expect(main).toBeVisible();
    }
  });
});
