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

    // simple demo view/route that shows a placeholder
    const stripeTemplate = `<div class="p-4">
  <h2>Stripe plugin installed</h2>
  <p>API key: ${cfg.apiKey || '(none provided)'}</p>
  <button ux-event="CALL_STRIPE" class="px-4 py-2 bg-green-600 text-white rounded">Call service</button>
</div>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('button[ux-event="CALL_STRIPE"]');
    btn?.addEventListener('click', async () => {
      const app = (window as any).__ux3App;
      if (app?.services?.stripe) {
        const client = await app.services.stripe.getClient();
        console.log('stripe client', client);
      }
    });
  });
</script>`;
    app.registerView('stripe-demo', stripeTemplate);
    app.registerRoute('/stripe', 'stripe-demo');
  }
};

export default StripePlugin;
