import type { Plugin } from '../../../../src/plugin/registry';
import type { AssetDescriptor } from '../../../../src/ui/app';
import { createRequire } from 'module';

const _chartsRequire = createRequire(import.meta.url);
const { version } = _chartsRequire('../package.json') as { version: string };

// minimal charting plugin example
export const ChartsJsPlugin: Plugin = {
  name: '@ux3/plugin-charts-js',
  version: version,
  install(app) {
    // Register the Chart.js CDN asset. Users can override via config.plugins['charts-js'].cdn.
    const cfg = (app.config.plugins as any)?.['charts-js'] ?? {};
    const cdnUrl: string = cfg.cdn ?? 'https://cdn.jsdelivr.net/npm/chart.js';
    app.registerAsset({ type: 'script', src: cdnUrl });

    // register a service that lazy-loads the charts library
    app.registerService('chart', () => {
      let chartsLib: any;
      async function load() {
        if (!chartsLib) {
          const moduleName = 'chart.js';
          chartsLib = await import(/* @vite-ignore */ moduleName);
        }
        return chartsLib;
      }
      return {
        create: async (el: HTMLElement, opts?: any) => {
          const c = await load();
          return c.init(el, opts);
        }
      };
    });

    // register a simple demo view/route showing how to use the service.
    // Inline <script> tags are forbidden by the framework's CSP policy; wire
    // chart initialisation via ux-event instead.
    const chartTemplate = `<div class="p-4">
  <h2>Chart demo</h2>
  <div id="chart" ux-event="INIT_CHART"></div>
  <button ux-event="INIT_CHART" class="px-4 py-2 bg-blue-500 text-white rounded">Render chart</button>
</div>`;
    app.registerView('chart-demo', chartTemplate);
    app.registerRoute('/charts', 'chart-demo');
  }
};

export default ChartsJsPlugin;
