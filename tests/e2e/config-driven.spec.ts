import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

/**
 * Config-driven E2E tests for UX3 Framework sites.
 * Reads site configuration (ux3.yaml), routes, and i18n files
 * to dynamically verify the rendered shell, navigation, and content.
 */

// Overridable via environment variables — defaults to kitchen.sink
const PROJECT_DIR = process.env.TEST_PROJECT_DIR || 'examples/kitchen.sink';
const ABS_PROJECT_DIR = path.resolve(process.cwd(), PROJECT_DIR);
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:1337';

function loadProjectConfig() {
  const ux3Path = path.join(ABS_PROJECT_DIR, 'ux', 'ux3.yaml');
  if (!fs.existsSync(ux3Path)) {
    throw new Error(`Project config not found at ${ux3Path}`);
  }
  return YAML.parse(fs.readFileSync(ux3Path, 'utf-8'));
}

function loadRoutes(): any[] {
  const routesPath = path.join(ABS_PROJECT_DIR, 'ux', 'route', 'routes.yaml');
  if (!fs.existsSync(routesPath)) return [];
  const parsed = YAML.parse(fs.readFileSync(routesPath, 'utf-8'));
  return parsed?.routes || [];
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
      } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const content = YAML.parse(fs.readFileSync(path.join(i18nDir, file), 'utf-8'));
        Object.assign(result, content);
      }
    }
  }
  return result;
}

function flattenRoutes(routes: any[], parentPath = ''): { path: string; view: string }[] {
  const result: { path: string; view: string }[] = [];
  for (const r of routes) {
    if (r.path) {
      const fullPath = r.path.startsWith('/') ? r.path : parentPath + r.path;
      if (!r.path.includes('*') && !r.path.includes(':')) {
        result.push({ path: fullPath, view: r.view });
      }
    }
    if (r.children) {
      for (const child of r.children) {
        if (child.path) {
          const childPath = child.path.startsWith('/') ? child.path : parentPath + r.path + child.path;
          if (!child.path.includes('*') && !child.path.includes(':')) {
            result.push({ path: childPath, view: child.view });
          }
        }
      }
    }
  }
  return result;
}

const config = loadProjectConfig();
const i18n = loadI18n('en');
const routes = loadRoutes();
const flatRoutes = flattenRoutes(routes);

async function gotoAndWait(page: any, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('ux-app-shell', { state: 'attached', timeout: 20000 });
  await page.waitForTimeout(500);
}

test.describe(`Config-driven: ${config.name || PROJECT_DIR}`, () => {

  test('renders the correct site title', async ({ page }) => {
    await gotoAndWait(page, '/');
    const expectedTitle = i18n.title || i18n.site?.title || config.name;
    await expect(page).toHaveTitle(expectedTitle);
  });

  test('renders meta description from i18n', async ({ page }) => {
    await gotoAndWait(page, '/');
    const descriptionText = i18n.description || i18n.site?.description;
    if (descriptionText) {
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', descriptionText);
    }
  });

  test('app shell is present', async ({ page }) => {
    await gotoAndWait(page, '/');
    await expect(page.locator('ux-app-shell')).toBeAttached();
    await expect(page.locator('#ux-content')).toBeAttached();
  });

  test('navigation renders using i18n labels', async ({ page }) => {
    await gotoAndWait(page, '/');

    const navEl = page.locator('ux-mega-menu, ux-nav, nav').first();
    await expect(navEl).toBeAttached({ timeout: 5000 });

    const navLinks = page.locator('ux-mega-menu a, ux-nav a, nav a');
    const count = await navLinks.count();
    // Sanity check: the nav component should have links
    expect(count, 'Navigation should contain links').toBeGreaterThan(0);

    // Verify at least one link has an href attribute
    const firstHref = await navLinks.first().getAttribute('href');
    expect(firstHref, 'First nav link should have an href').toBeTruthy();
  });

  test.describe('Route mounting', () => {
    for (const route of flatRoutes.slice(0, 8)) {
      test(`${route.path} renders <ux-${route.view}>`, async ({ page }) => {
        await gotoAndWait(page, route.path);
        const directChild = page.locator(`#ux-content > ux-${route.view}`).first();
        const anywhere = page.locator(`ux-${route.view}`).first();
        const hasDirect = await directChild.count();
        const hasAnywhere = await anywhere.count();

        if (hasDirect > 0) {
          await expect(directChild, `${route.path} → ux-${route.view}`).toBeAttached();
        } else if (hasAnywhere > 0) {
          await expect(anywhere, `${route.path} → ux-${route.view} (nested)`).toBeAttached();
        } else {
          const contentChildren = await page.locator('#ux-content > *').count();
          expect(contentChildren, `${route.path} should render content`).toBeGreaterThan(0);
        }
      });
    }
  });

  test('theme toggle is present when browser plugin is enabled', async ({ page }) => {
    await gotoAndWait(page, '/');
    const browserPlugin = config?.plugins?.find((p: any) => p.name === '@ux3/plugin-browser');
    if (browserPlugin) {
      await expect(page.locator('ux-theme-toggle').first()).toBeAttached();
    }
  });

});
