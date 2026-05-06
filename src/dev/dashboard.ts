import * as path from 'path';
import fsExtra from 'fs-extra';
import { renderTpl } from './asset-processor';

const DASHBOARD_TEMPLATE_PATH = path.join(
  process.cwd(),
  'packages',
  '@ux3',
  'plugin-dev-tools',
  'ux',
  'view',
  'dev-tools',
  'dashboard.html'
);

const DASHBOARD_I18N_PATH = path.join(
  process.cwd(),
  'packages',
  '@ux3',
  'plugin-dev-tools',
  'ux',
  'i18n',
  'en',
  'dev-tools.json'
);

function loadDashboardTemplate(): string {
  if (!fsExtra.existsSync(DASHBOARD_TEMPLATE_PATH)) {
    throw new Error(`Missing dev tools dashboard template: ${DASHBOARD_TEMPLATE_PATH}`);
  }

  return fsExtra.readFileSync(DASHBOARD_TEMPLATE_PATH, 'utf-8');
}

function loadDashboardI18n(): Record<string, unknown> {
  if (!fsExtra.existsSync(DASHBOARD_I18N_PATH)) {
    throw new Error(`Missing dev tools dashboard i18n bundle: ${DASHBOARD_I18N_PATH}`);
  }

  return fsExtra.readJsonSync(DASHBOARD_I18N_PATH) as Record<string, unknown>;
}

function getWidgetEntries(manifest: any): Array<{ name: string; slug: string }> {
  const widgets = manifest?.config?.widgets;
  if (widgets && typeof widgets === 'object') {
    return Object.keys(widgets).map((name) => ({ name, slug: name }));
  }

  const views = manifest?.config?.views;
  if (views && typeof views === 'object') {
    return Object.keys(views).map((name) => ({ name, slug: name }));
  }

  const machines = manifest?.config?.machines;
  if (machines && typeof machines === 'object') {
    return Object.keys(machines).map((name) => ({ name, slug: name }));
  }

  return [];
}

/**
 * Generates the Dev Dashboard HTML by wrapping the dashboard "view" 
 * in the project's own layout/chrome.
 */
export async function renderDashboard(projectDir: string, manifest: any, site: any) {
  const projectName = path.basename(projectDir);

  const widgets = getWidgetEntries(manifest);
  const dashboardTemplate = loadDashboardTemplate();
  const dashboardI18n = loadDashboardI18n();
  const dashboardContent = renderTpl(dashboardTemplate, {
    site,
    i18n: dashboardI18n,
    project: {
      name: projectName,
      path: projectDir,
      buildTime: new Date(manifest?.stats?.buildTime || Date.now()).toLocaleString(),
    },
    summaryJson: JSON.stringify({
      views: widgets.length,
      services: Object.keys(manifest?.config?.services || {}).length,
      routes: Array.isArray(manifest?.config?.routes) ? manifest.config.routes.length : Object.keys(manifest?.config?.routes || {}).length,
    }, null, 2),
    views: widgets,
  });

  // Look for project layout or fallback to framework layout
  const chromeWrapperPath = path.join(projectDir, 'ux', 'layout', 'chrome', 'wrapper.html');
  const projectFallbackPath = path.join(projectDir, 'ux', 'layout', '_.html');
  const frameworkDefaultLayout = path.join(process.cwd(), 'src', 'ui', 'layouts', '_.html');

  let layoutTpl = '';
  if (fsExtra.existsSync(chromeWrapperPath)) {
    layoutTpl = fsExtra.readFileSync(chromeWrapperPath, 'utf-8');
  } else if (fsExtra.existsSync(projectFallbackPath)) {
    layoutTpl = fsExtra.readFileSync(projectFallbackPath, 'utf-8');
  } else if (fsExtra.existsSync(frameworkDefaultLayout)) {
    layoutTpl = fsExtra.readFileSync(frameworkDefaultLayout, 'utf-8');
  }

  // Inject dashboard content into layout
  let finalHtml = layoutTpl || dashboardContent;
  if (layoutTpl) {
    // Replace content placeholder
    finalHtml = finalHtml.replace(/\{\{\s*>\s*layout\s*\}\}/g, dashboardContent);
    finalHtml = finalHtml.replace(/\{\{\s*site\.template\s*\}\}/g, dashboardContent);
    // Render placeholders
    finalHtml = renderTpl(finalHtml, { site, i18n: manifest?.config?.i18n || {} });
  }

  return finalHtml;
}
