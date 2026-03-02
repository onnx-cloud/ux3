import type { Plugin } from '../../../src/plugin/registry';
import type { AssetDescriptor } from '../../../src/ui/app';

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

    // register a simple demo view/route showing how to use the service
    const chartTemplate = `<div class="p-4">
  <h2>Chart demo</h2>
  <div id="chart"></div>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const app = (window as any).__ux3App;
      if (app?.services?.chart) {
        app.services.chart.create(document.getElementById('chart'))
          .catch(console.error);
      }
    });
  </script>
</div>`;
    app.registerView('chart-demo', chartTemplate);
    app.registerRoute('/charts', 'chart-demo');
  }
};

export default ChartsJsPlugin;
