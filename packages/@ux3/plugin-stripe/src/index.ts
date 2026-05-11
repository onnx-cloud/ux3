import type { Plugin } from '../../../../src/plugin/registry';

const version = '0.1.0';

const STRIPE_CDN = 'https://js.stripe.com/v3';

export interface StripeConfig {
  publishableKey?: string;
  cdn?: string;
}

export interface PaymentResult {
  success: boolean;
  token?: { id: string; card: any };
  error?: { message: string; code?: string };
}

function readConfig(app: any): StripeConfig {
  return (StripePlugin as any).config ?? app.config?.plugins?.['@ux3/plugin-stripe'] ?? {};
}

function getStripe(): any {
  if (typeof window !== 'undefined' && (window as any).Stripe) {
    return (window as any).Stripe;
  }
  return null;
}

export const StripePlugin: Plugin = {
  name: '@ux3/plugin-stripe',
  version,
  description: 'Stripe payment form integration for UX3 — PCI-compliant tokenization',

  install(app) {
    const cfg = readConfig(app);
    const cdnUrl = cfg.cdn ?? STRIPE_CDN;

    app.registerAsset?.({ type: 'script', src: cdnUrl });

    app.registerService?.('stripe', () => ({
      get stripe(): any {
        const StripeFn = getStripe();
        if (!StripeFn || !cfg.publishableKey) return null;
        return StripeFn(cfg.publishableKey);
      },

      async tokenize(cardElement: any): Promise<PaymentResult> {
        const stripe = this.stripe;
        if (!stripe) throw new Error('Stripe.js not loaded or publishableKey not configured');
        try {
          const result = await stripe.createToken(cardElement);
          if (result.error) {
            return { success: false, error: { message: result.error.message, code: result.error.code } };
          }
          return { success: true, token: result.token };
        } catch (e) {
          return { success: false, error: { message: (e as Error).message } };
        }
      },

      async createPaymentIntent(backendUrl: string, amount: number, currency = 'usd'): Promise<any> {
        const res = await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, currency }),
        });
        if (!res.ok) throw new Error(`Payment intent creation failed: ${res.status}`);
        return res.json();
      },
    }));

    app.utils = app.utils ?? {};
    (app.utils as any).stripe = { cdn: cdnUrl, key: cfg.publishableKey };
  },
};

export default StripePlugin;
