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

    // simple demo view/route that shows a placeholder.
    // API key is placed in a data attribute so it is never interpolated raw
    // into the HTML string (avoids XSS if key were user-supplied).
    const safeKeyLabel = cfg.apiKey
      ? `pk_…${String(cfg.apiKey).slice(-4)}`  // only show last 4 chars
      : '(none provided)';
    const stripeTemplate = `<div class="p-4">
  <h2>Stripe plugin installed</h2>
  <p>API key hint: <code data-stripe-key-hint="${safeKeyLabel.replace(/"/g, '&quot;')}">${safeKeyLabel}</code></p>
  <button ux-event="CALL_STRIPE" class="px-4 py-2 bg-green-600 text-white rounded">Call service</button>
</div>`;
    app.registerView('stripe-demo', stripeTemplate);
    app.registerRoute('/stripe', 'stripe-demo');
  }
};

export default StripePlugin;
