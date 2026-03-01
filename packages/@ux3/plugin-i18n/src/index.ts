import type { Plugin } from '../../../src/plugin/registry';

// A simple i18n plugin placeholder
export const I18nPlugin: Plugin = {
  name: '@ux3/plugin-i18n',
  version: '1.0.0',
  install(app) {
    // augment app.i18n with advanced features
    const orig = app.i18n;
    app.i18n = (key: string, props?: Record<string, any>) => {
      // placeholder for translation lookup
      return orig(key, props);
    };
  }
};

export default I18nPlugin;