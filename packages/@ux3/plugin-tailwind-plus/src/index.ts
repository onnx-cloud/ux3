import type { Plugin } from '../../../../src/plugin/registry';
import type { AppContext } from '../../../../src/ui/app';

export interface TailwindPlusWidgetDefinition {
  id: string;
  source: string;
  template: string;
  view?: string;
  route?: string;
}

export interface TailwindPlusPluginConfig {
  css?: string;
  widgets?: TailwindPlusWidgetDefinition[];
}

const OFFICIAL_PLUS_HOSTS = new Set(['tailwindcss.com', 'www.tailwindcss.com']);

function getTailwindPlusConfig(app: AppContext): TailwindPlusPluginConfig {
  const plugins = app.config?.plugins;

  if (Array.isArray(plugins)) {
    const fromList = plugins.find((entry: { name?: string; config?: TailwindPlusPluginConfig }) =>
      entry?.name === '@ux3/plugin-tailwind-plus'
    );
    if (fromList?.config && typeof fromList.config === 'object') {
      return fromList.config;
    }
  }

  const keyedConfig = plugins?.['tailwind-plus'] || plugins?.['@ux3/plugin-tailwind-plus'];
  return keyedConfig && typeof keyedConfig === 'object' ? keyedConfig : {};
}

function sanitizeName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveViewName(widgetId: string): string {
  const normalized = sanitizeName(widgetId) || 'widget';
  return `tailwind-plus-${normalized}`;
}

export function isOfficialTailwindPlusSource(url: string): boolean {
  try {
    const parsed = new URL(url);
    return OFFICIAL_PLUS_HOSTS.has(parsed.hostname) && parsed.pathname.startsWith('/plus/');
  } catch {
    return false;
  }
}

export function normalizeTailwindPlusWidgets(raw: unknown): TailwindPlusWidgetDefinition[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((candidate): candidate is TailwindPlusWidgetDefinition => {
    if (!candidate || typeof candidate !== 'object') {
      return false;
    }

    const record = candidate as Record<string, unknown>;
    return (
      typeof record.id === 'string' &&
      record.id.trim().length > 0 &&
      typeof record.source === 'string' &&
      isOfficialTailwindPlusSource(record.source) &&
      typeof record.template === 'string' &&
      record.template.trim().length > 0 &&
      (record.view === undefined || typeof record.view === 'string') &&
      (record.route === undefined || typeof record.route === 'string')
    );
  });
}

export function registerOfficialTailwindPlusWidgets(
  app: AppContext,
  widgets: TailwindPlusWidgetDefinition[]
): { registered: number; skipped: number } {
  let registered = 0;

  for (const widget of widgets) {
    const viewName = widget.view && widget.view.trim().length > 0
      ? widget.view.trim()
      : deriveViewName(widget.id);

    app.registerView?.(viewName, widget.template);

    if (widget.route && widget.route.trim().length > 0) {
      app.registerRoute?.(widget.route.trim(), viewName);
    }

    registered += 1;
  }

  return { registered, skipped: Math.max(0, widgets.length - registered) };
}

function registerConfiguredCssAsset(app: AppContext, cssPath: string): void {
  const isScript = cssPath.includes('@tailwindcss/browser') || cssPath.endsWith('.js');
  if (isScript) {
    app.registerAsset?.({ type: 'script', src: cssPath });
  } else {
    app.registerAsset?.({ type: 'style', href: cssPath });
  }
}

export function mergeClasses(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter((cls): cls is string => typeof cls === 'string' && cls.length > 0).join(' ');
}

// ============================================================================
// PLUGIN REGISTRATION
// ============================================================================

const { version: _plusVersion } = '0.1.0';

export const TailwindPlusPlugin: Plugin = {
  name: '@ux3/plugin-tailwind-plus',
  version: _plusVersion,
  description: 'Official Tailwind Plus widget integration for UX3',
  async install(app: AppContext) {
    const pluginConfig = getTailwindPlusConfig(app);
    const cssPath = pluginConfig.css;

    if (cssPath) {
      registerConfiguredCssAsset(app, cssPath);
    }

    const officialWidgets = normalizeTailwindPlusWidgets(pluginConfig.widgets);
    const configuredWidgetCount = Array.isArray(pluginConfig.widgets) ? pluginConfig.widgets.length : 0;

    if (officialWidgets.length > 0) {
      registerOfficialTailwindPlusWidgets(app, officialWidgets);
    }

    if (configuredWidgetCount > officialWidgets.length) {
      app.logger?.warn?.(
        '[tailwind-plus] skipped one or more widgets because definitions were invalid or not from tailwindcss.com/plus'
      );
    }

    app.utils = app.utils || {};
    (app.utils as any).tailwindPlus = {
      mergeClasses,
      isOfficialTailwindPlusSource,
      normalizeTailwindPlusWidgets,
      registerOfficialTailwindPlusWidgets
    };
  }
};

export default TailwindPlusPlugin;
