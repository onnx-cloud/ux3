import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

const DEFAULT_CDN = 'https://cdn.jsdelivr.net/npm/chart.js';

export interface ChartJsConfig {
  /** Load and cache Chart.js from CDN (default: true) */
  bundled?: boolean;
  /** Override the Chart.js CDN URL */
  cdn?: string;
}

export type ChartType =
  | 'bar' | 'line' | 'pie' | 'doughnut' | 'radar'
  | 'polarArea' | 'bubble' | 'scatter';

export interface ChartConfiguration {
  type: ChartType;
  data: Record<string, unknown>;
  options?: Record<string, unknown>;
}

function readConfig(app: any): ChartJsConfig {
  return (
    (ChartJsPlugin as any).config ??
    app.config?.plugins?.['@ux3/plugin-chart-js'] ??
    {}
  );
}

/** Resolve the Chart constructor from window global (set by CDN) or dynamic import. */
async function resolveChart(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).Chart) {
    return (window as any).Chart;
  }
  // Dynamic import used as fallback when bundled via a module bundler (e.g. Vite).
  // The indirection prevents static analysis tools from treating chart.js as a
  // required peer dependency during type-checking.
  const moduleName = 'chart.js';
  const mod = await import(/* @vite-ignore */ moduleName);
  return mod.Chart ?? mod.default ?? mod;
}

export const ChartJsPlugin: Plugin = {
  name: '@ux3/plugin-chart-js',
  version,
  description: 'Chart.js integration for UX3',

  install(app) {
    const cfg = readConfig(app);
    const cdnUrl = cfg.cdn ?? DEFAULT_CDN;

    app.registerAsset?.({ type: 'script', src: cdnUrl });

    app.registerService?.('chart', () => ({
      /**
       * Create a Chart.js chart in the given canvas element.
       *
       * @param el  A CSS selector string or a canvas HTMLElement.
       * @param config  Chart.js configuration object ({ type, data, options }).
       */
      async create(el: HTMLElement | string, config: ChartConfiguration) {
        const Chart = await resolveChart();
        const canvas =
          typeof el === 'string'
            ? (document.querySelector(el) as HTMLElement | null)
            : el;
        if (!canvas) {
          throw new Error('@ux3/plugin-chart-js: target element not found');
        }
        return new Chart(canvas, config);
      },
    }));

    app.utils = app.utils ?? {};
    (app.utils as any).chart = { cdn: cdnUrl };
  },
};

export default ChartJsPlugin;
