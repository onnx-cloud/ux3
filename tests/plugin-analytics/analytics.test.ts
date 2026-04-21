import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AnalyticsPlugin,
  createDataLayerProvider,
  createGoogleAnalyticsProvider,
  type AnalyticsProvider,
} from '@ux3/plugin-analytics';

describe('AnalyticsPlugin', () => {
  let mockApp: any;

  beforeEach(() => {
    vi.useFakeTimers();
    mockApp = {
      config: {
        plugins: {
          '@ux3/plugin-analytics': {
            endpoint: 'https://api.example.com/logs',
            batchSize: 20,
            flushInterval: 5000
          }
        }
      },
      logger: {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      }
    };

    (globalThis as any).fetch = vi.fn(() => Promise.resolve({ ok: true }));
  });

  afterEach(() => {
    try {
      mockApp?._analyticsCleanup?.();
    } catch {
      // no-op
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should have correct plugin metadata', () => {
    expect(AnalyticsPlugin.name).toBe('@ux3/plugin-analytics');
    expect(AnalyticsPlugin.version).toBe('1.0.0');
    expect(AnalyticsPlugin.description).toContain('analytics');
  });

  it('should install plugin on app', () => {
    expect(() => {
      AnalyticsPlugin.install(mockApp);
    }).not.toThrow();
  });

  it('should read analytics config from app.config', () => {
    AnalyticsPlugin.install(mockApp);
    expect(mockApp.config.plugins['@ux3/plugin-analytics'].endpoint).toBe(
      'https://api.example.com/logs'
    );
  });

  it('should use default batch size when not specified', () => {
    const appWithDefaults = {
      config: { plugins: { '@ux3/plugin-analytics': { providers: [{ name: 'mock', track: vi.fn() }] } } },
      logger: { subscribe: vi.fn(), unsubscribe: vi.fn() }
    };
    expect(() => {
      AnalyticsPlugin.install(appWithDefaults);
    }).not.toThrow();
  });

  it('should subscribe to logger', () => {
    AnalyticsPlugin.install(mockApp);
    expect(mockApp.logger.subscribe).toHaveBeenCalled();
  });

  it('should batch events by default', async () => {
    AnalyticsPlugin.install(mockApp);
    const loggerListener = mockApp.logger.subscribe.mock.calls[0][0];

    loggerListener({ key: 'evt.1', level: 'log', meta: { n: 1 }, timestamp: Date.now() });
    loggerListener({ key: 'evt.2', level: 'warn', meta: { n: 2 }, timestamp: Date.now() });

    expect((globalThis as any).fetch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5_001);
    await Promise.resolve();

    expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
  });

  it('should support realtime mode with custom provider', () => {
    const provider: AnalyticsProvider = {
      name: 'custom',
      track: vi.fn(),
    };

    const app = {
      config: {
        plugins: {
          '@ux3/plugin-analytics': {
            mode: 'realtime',
            providers: [provider],
          },
        },
      },
      logger: {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      },
    } as any;

    AnalyticsPlugin.install(app);
    const loggerListener = app.logger.subscribe.mock.calls[0][0];
    loggerListener({ key: 'user.click', level: 'log', meta: { button: 'cta' }, timestamp: Date.now() });

    expect(provider.track).toHaveBeenCalledTimes(1);
  });

  it('should expose analytics utility methods on app.utils', () => {
    const provider: AnalyticsProvider = {
      name: 'custom',
      track: vi.fn(),
    };
    const app = {
      config: {
        plugins: {
          '@ux3/plugin-analytics': {
            mode: 'realtime',
            providers: [provider],
          },
        },
      },
      logger: {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      },
    } as any;

    AnalyticsPlugin.install(app);
    app.utils.analyticsSetContext({ tenant: 'acme' });
    app.utils.analyticsTrack('manual.event', { ok: true });
    expect(provider.track).toHaveBeenCalledTimes(1);

    const firstCall = (provider.track as any).mock.calls[0][0];
    expect(firstCall.name).toBe('manual.event');
    expect(firstCall.context.tenant).toBe('acme');
  });
});

describe('Analytics providers', () => {
  it('data layer provider pushes events to window.dataLayer', () => {
    const provider = createDataLayerProvider();
    (window as any).dataLayer = [];

    provider.track({ name: 'checkout.start', payload: { plan: 'pro' } });

    expect((window as any).dataLayer).toHaveLength(1);
    expect((window as any).dataLayer[0].event).toBe('checkout.start');
  });

  it('google analytics provider is safe when gtag is missing', () => {
    (window as any).gtag = undefined;
    const provider = createGoogleAnalyticsProvider();

    expect(() => provider.track({ name: 'page.view' })).not.toThrow();
  });
});
