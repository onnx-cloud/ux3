// simple stripe plugin example
module.exports = {
  name: '@ux3/plugin-stripe',
  version: '0.1.0',
  install(app) {
    const cfg = app.config.plugins?.stripe || {};
    // read key/other options from config or env
    app.config.site = app.config.site || {};
    app.config.site.assets = app.config.site.assets || [];
    if (cfg.cdn) {
      app.config.site.assets.push({ type: 'script', src: cfg.cdn });
    }

    app.registerService('stripe', () => {
      let stripeLib;
      async function load() {
        if (!stripeLib) stripeLib = await import('stripe');
        return stripeLib;
      }
      return {
        getClient: async () => {
          const lib = await load();
          return lib(cfg.apiKey);
        }
      };
    });
  }
};
