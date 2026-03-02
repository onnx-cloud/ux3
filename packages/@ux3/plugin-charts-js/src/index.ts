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
  }
};

export default ChartsJsPlugin;
