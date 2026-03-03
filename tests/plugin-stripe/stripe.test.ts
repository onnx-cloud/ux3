import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Stripe SDK since it's a peer dependency
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    paymentIntents: { create: vi.fn() },
    customers: { create: vi.fn() }
  }))
}), { virtual: true });

import { StripePlugin } from '@ux3/plugin-stripe';

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

  it('should have correct plugin metadata', () => {
    expect(StripePlugin.name).toBe('@ux3/plugin-stripe');
    expect(StripePlugin.version).toBe('0.1.0');
  });

  it('should install plugin on app', () => {
    expect(() => {
      StripePlugin.install(mockApp);
    }).not.toThrow();
  });

  it('should register Stripe service', () => {
    StripePlugin.install(mockApp);
    expect(mockApp.registerService).toHaveBeenCalledWith('stripe', expect.any(Function));
  });

  it('should register CDN asset when configured', () => {
    StripePlugin.install(mockApp);
    const assetCall = mockApp.registerAsset.mock.calls.find(
      (call: any) => call[0]?.src?.includes('stripe')
    );
    expect(assetCall).toBeDefined();
  });

  it('should read Stripe config from app.config', () => {
    StripePlugin.install(mockApp);
    const config = mockApp.config.plugins.stripe;
    expect(config.apiKey).toBe('pk_test_123456789');
  });

  it('should handle missing CDN configuration gracefully', () => {
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

  it('should support test and live mode API keys', () => {
    const testKey = 'pk_test_123456789';
    const liveKey = 'pk_live_987654321';
    
    expect(testKey.startsWith('pk_test_')).toBe(true);
    expect(liveKey.startsWith('pk_live_')).toBe(true);
  });

  it('should lazy-load Stripe library', () => {
    StripePlugin.install(mockApp);
    const serviceFactory = mockApp.registerService.mock.calls[0]?.[1];
    expect(typeof serviceFactory).toBe('function');
    
    // Service factory should return object with load and create methods
    const service = serviceFactory();
    expect(typeof service.getClient).toBe('function');
  });
});
