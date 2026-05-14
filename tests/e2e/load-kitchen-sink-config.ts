import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

// == Kitchen Sink Config Loader ==
// Reads the kitchen.sink example project config files and returns structured data
// that e2e tests use to dynamically verify the rendered application.

const KS_DIR = path.resolve(process.cwd(), 'examples/kitchen.sink');

function loadYaml<T = any>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return YAML.parse(fs.readFileSync(filePath, 'utf-8'));
}

export interface FlatRoute {
  path: string;
  view: string;
  label?: string;
}

export function loadProjectConfig() {
  return loadYaml<any>(path.join(KS_DIR, 'ux/ux3.yaml'));
}

export function loadRoutes(): any[] {
  const cfg = loadYaml<any>(path.join(KS_DIR, 'ux/route/routes.yaml'));
  return cfg?.routes || [];
}

export function loadI18n(lang = 'en'): Record<string, any> {
  const dir = path.join(KS_DIR, 'ux/i18n', lang);
  if (!fs.existsSync(dir)) return {};
  const result: Record<string, any> = {};
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const content = loadYaml(path.join(dir, file));
      if (content) Object.assign(result, content);
    }
  }
  return result;
}

export function loadWidget(name: string): any {
  return loadYaml(path.join(KS_DIR, 'ux/widget', `${name}.yaml`));
}

export function flattenRoutes(routes: any[], parentPath = ''): FlatRoute[] {
  const result: FlatRoute[] = [];
  for (const r of routes) {
    if (r.path) {
      const fullPath = r.path.startsWith('/') ? r.path : parentPath + r.path;
      if (!r.path.includes('*') && !r.path.includes(':')) {
        result.push({ path: fullPath, view: r.view, label: r.label });
      }
    }
    if (r.children) {
      // Child paths that start with / are absolute — use them directly
      // Otherwise, concatenate with parent path
      for (const child of r.children) {
        if (child.path) {
          const childPath = child.path.startsWith('/') ? child.path : parentPath + r.path + child.path;
          if (!child.path.includes('*') && !child.path.includes(':')) {
            result.push({ path: childPath, view: child.view, label: child.label });
          }
        }
      }
    }
  }
  return result;
}

export function getEnabledPlugins(projectConfig: any): string[] {
  return (projectConfig?.plugins || []).map((p: any) => p.name);
}

// Stable mapping: each plugin registers known custom element tags.
// This is the plugin's public API contract — it changes only when a plugin adds/removes widgets.
export const PLUGIN_TAGS: Record<string, string[]> = {
  '@ux3/plugin-browser': ['ux-theme-toggle', 'ux-network-status'],
  '@ux3/plugin-i18n': ['ux-lang-switcher'],
  '@ux3/ux-charts': ['ux-chart-line', 'ux-chart-bar', 'ux-chart-donut'],
  '@ux3/ux-cytoscape': ['ux-graph'],
  '@ux3/ux-icons': ['ux-icon'],
  '@ux3/ux-openmaps': ['ux-map'],
  '@ux3/plugin-oidc': ['ux-oidc-controls'],
  '@ux3/ux-search-lunr': ['ux-search-bar'],
  '@ux3/ux-planning': ['ux-calendar', 'ux-kanban', 'ux-flow-editor', 'ux-gantt'],
  '@ux3/ux-dashboard': ['ux-dashboard', 'ux-kpi-board', 'ux-workflow'],
  '@ux3/ux-data-builders': ['ux-pivot-table', 'ux-filter-builder', 'ux-query-builder', 'ux-report-builder'],
  '@ux3/ux-chat': ['ux-chat-messenger', 'ux-chat-composer'],
  '@ux3/plugin-mcp': [],
  '@ux3/plugin-validation': [],
  '@ux3/plugin-analytics': [],
  '@ux3/plugin-dev-tools': [],
  '@ux3/ux-google-fonts': [],
  '@ux3/plugin-telemetry': [],
  '@ux3/plugin-store': [],
  '@ux3/ux-tailwind': [],
};

export function getPluginTags(enabledPlugins: string[]): string[] {
  return enabledPlugins.flatMap((name: string) => PLUGIN_TAGS[name] || []);
}

// Core primitives always registered by registerBuiltInPrimitives()
export const SHELL_TAGS = [
  'ux-app-shell', 'ux-topbar',
];

export const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:1337';
