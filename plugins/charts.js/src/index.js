// example charting plugin
module.exports = {
  name: '@ux3/plugin-charts-js',
  version: '0.1.0',
  install(app) {
    // add CDN script as an example of runtime asset registration
    app.config.site = app.config.site || {};
    app.config.site.assets = app.config.site.assets || [];
    app.config.site.assets.push({ type: 'script', src: 'https://cdn.example.com/charts.js' });

    // register a service that lazy‑loads the charts library
    app.registerService('chart', () => {
      let chartsLib;
      async function load() {
        if (!chartsLib) chartsLib = await import('charts.js');
        return chartsLib;
      }
      return {
        create: async (el, opts) => {
          const c = await load();
          return c.init(el, opts);
        }
      };
    });
  }
};
