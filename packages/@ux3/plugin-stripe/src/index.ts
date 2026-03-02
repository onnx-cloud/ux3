import type { Plugin } from '../../../src/plugin/registry';
import type { AssetDescriptor } from '../../../src/ui/app';

export interface StripeConfig {
  apiKey?: string;
  cdn?: string;
}

export const StripePlugin: Plugin = {
  name: '@ux3/plugin-stripe',
  version: '0.1.0',
  install(app) {
    const cfg: StripeConfig = app.config.plugins?.stripe || {};

    if (cfg.cdn) {
      app.registerAsset({ type: 'script', src: cfg.cdn });
    }

    app.registerService('stripe', () => {
      let stripeLib: any;
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

export default StripePlugin;
