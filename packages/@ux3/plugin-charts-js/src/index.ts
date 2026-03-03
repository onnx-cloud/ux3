import type { Plugin } from '@ux3/ux3';
import type { AssetDescriptor } from '@ux3/ux3';

// minimal charting plugin example
export const ChartsJsPlugin: Plugin = {
  name: '@ux3/plugin-charts-js',
  version: '0.1.0',
  install(app) {
    // register a CDN script asset (helper method catches missing site)
    app.registerAsset({ type: 'script', src: 'https://cdn.example.com/charts.js' });

    // register a service that lazy-loads the charts library
    app.registerService('chart', () => {
      let chartsLib: any;
      async function load() {
        if (!chartsLib) chartsLib = await import('charts.js');
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
