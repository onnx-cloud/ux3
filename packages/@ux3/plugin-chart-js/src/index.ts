import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';
import { UxChart } from './chart.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

const DEFAULT_CDN = 'https://cdn.jsdelivr.net/npm/chart.js';

function readConfig(app: any): { bundled?: boolean; cdn?: string } {
  return (ChartJsPlugin as any).config ?? app.config?.plugins?.['@ux3/plugin-chart-js'] ?? {};
}

async function resolveChart(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).Chart) return (window as any).Chart;
  const mod = await import(/* @vite-ignore */ 'chart.js');
  return mod.Chart ?? mod.default ?? mod;
}

export const ChartJsPlugin: Plugin = {
  name: '@ux3/plugin-chart-js',
  version,
  description: 'Chart.js integration for UX3',
  install(app) {
    const cfg = readConfig(app);
    app.registerAsset?.({ type: 'script', src: cfg.cdn ?? DEFAULT_CDN });

    if (!customElements.get('ux-chart-line')) customElements.define('ux-chart-line', UxChart);
    if (!customElements.get('ux-chart-bar')) customElements.define('ux-chart-bar', UxChart);
    if (!customElements.get('ux-chart-donut')) customElements.define('ux-chart-donut', UxChart);

    app.registerService?.('chart', () => ({
      async create(el: HTMLElement | string, config: Record<string, unknown>) {
        const Chart = await resolveChart();
        const canvas = typeof el === 'string' ? document.querySelector(el) : el;
        if (!canvas) throw new Error('@ux3/plugin-chart-js: target element not found');
        return new Chart(canvas, config);
      },
    }));

    app.utils = app.utils ?? {};
    (app.utils as any).chart = { cdn: cfg.cdn ?? DEFAULT_CDN };
  },
};

export { UxChart };
export default ChartJsPlugin;
