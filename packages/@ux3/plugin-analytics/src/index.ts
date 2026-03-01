import type { Plugin } from '../../../src/plugin/registry';

export const AnalyticsPlugin: Plugin = {
  name: '@ux3/plugin-analytics',
  version: '1.0.0',
  install(app) {
    app.logger?.subscribe(entry => {
      // send analytics
    });
  }
};

export default AnalyticsPlugin;