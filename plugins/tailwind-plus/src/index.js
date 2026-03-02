// Tailwind‑PLUS example plugin
module.exports = {
  name: '@ux3/plugin-tailwind-plus',
  version: '0.1.0',
  install(app) {
    // build‑time integration is necessary but at runtime we may still register
    // the compiled stylesheet as an asset for hydration.
    app.config.site = app.config.site || {};
    app.config.site.assets = app.config.site.assets || [];
    if (app.config.plugins?.['tailwind-plus']?.css) {
      app.config.site.assets.push({ type: 'style', href: app.config.plugins['tailwind-plus'].css });
    }

    // provide a helper hook
    app.utils = app.utils || {};
    app.utils.useStyle = () => {
      // stubbed; real implementation would merge class lists etc.
      return (base, extra) => `${base} ${extra || ''}`;
    };
  }
};
