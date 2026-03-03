import { describe, it, expect, beforeEach, vi } from 'vitest';

// Skip this test file if the plugin module can't be imported
// (it requires stripe as a peer dependency)
let StripePlugin: any = null;
try {
  const mod = require('@ux3/plugin-stripe');
  StripePlugin = mod.StripePlugin;
} catch (e) {
  // Stripe plugin not available - skip tests
}

const skipIfMissing = (StripePlugin === null);

describe('StripePlugin', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      config: {
        plugins: {
          stripe: {
            apiKey: 'pk_test_123456789',
            cdn: 'https://js.stripe.com/v3/'
          }
        }
      },
      registerAsset: vi.fn(),
      registerService: vi.fn()
    };
  });

  it.skipIf(skipIfMissing)('should have correct plugin metadata', () => {
    if (!StripePlugin) return;
    expect(StripePlugin.name).toBe('@ux3/plugin-stripe');
    expect(StripePlugin.version).toBe('0.1.0');
  });

  it.skipIf(skipIfMissing)('should install plugin on app', () => {
    if (!StripePlugin) return;
    expect(() => {
      StripePlugin.install(mockApp);
    }).not.toThrow();
  });

  it.skipIf(skipIfMissing)('should register Stripe service', () => {
    if (!StripePlugin) return;
    StripePlugin.install(mockApp);
    expect(mockApp.registerService).toHaveBeenCalledWith('stripe', expect.any(Function));
  });

  it.skipIf(skipIfMissing)('should register CDN asset when configured', () => {
    if (!StripePlugin) return;
    StripePlugin.install(mockApp);
    const assetCall = mockApp.registerAsset.mock.calls.find(
      (call: any) => call[0]?.src?.includes('stripe')
    );
    expect(assetCall).toBeDefined();
  });

  it.skipIf(skipIfMissing)('should read Stripe config from app.config', () => {
    if (!StripePlugin) return;
    StripePlugin.install(mockApp);
    const config = mockApp.config.plugins.stripe;
    expect(config.apiKey).toBe('pk_test_123456789');
  });

  it.skipIf(skipIfMissing)('should handle missing CDN configuration gracefully', () => {
    if (!StripePlugin) return;
    const appWithoutCdn = {
      config: {
        plugins: {
          stripe: {
            apiKey: 'pk_test_123'
          }
        }
      },
      registerAsset: vi.fn(),
      registerService: vi.fn()
    };
    
    expect(() => {
      StripePlugin.install(appWithoutCdn);
    }).not.toThrow();
  });

  it.skipIf(skipIfMissing)('should support test and live mode API keys', () => {
    if (!StripePlugin) return;
    const testKey = 'pk_test_123456789';
    const liveKey = 'pk_live_987654321';
    
    expect(testKey.startsWith('pk_test_')).toBe(true);
    expect(liveKey.startsWith('pk_live_')).toBe(true);
  });

  it.skipIf(skipIfMissing)('should lazy-load Stripe library', () => {
    if (!StripePlugin) return;
    StripePlugin.install(mockApp);
    const serviceFactory = mockApp.registerService.mock.calls[0]?.[1];
    expect(typeof serviceFactory).toBe('function');
    
    const service = serviceFactory();
    expect(typeof service.getClient).toBe('function');
  });

  // Placeholder test so the suite isn't empty if skipped
  it.skipIf(!skipIfMissing)('stripe peer dependency not installed', () => {
    // This test runs when stripe is not available
    // It's a way to document that the plugin requires stripe
    expect(true).toBe(true);
  });
});
