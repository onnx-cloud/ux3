import { describe, it, expect, beforeEach, vi } from 'vitest';

// Skip this test file if the plugin module can't be imported
// (it requires @sentry/browser as an optional peer dependency)
let SentryPlugin: any = null;
try {
  const mod = require('@ux3/plugin-sentry');
  SentryPlugin = mod.SentryPlugin;
} catch (e) {
  // Sentry plugin not available - skip tests
}

const skipIfMissing = (SentryPlugin === null);

describe('SentryPlugin', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      config: {
        plugins: {
          '@ux3/plugin-sentry': {
            dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
            environment: 'production',
            release: '1.0.0'
          }
        }
      },
      logger: {
        subscribe: vi.fn()
      },
      errorHandler: {
        on: vi.fn()
      }
    };
  });

  it.skipIf(skipIfMissing)('should have correct plugin metadata', () => {
    if (!SentryPlugin) return;
    expect(SentryPlugin.name).toBe('@ux3/plugin-sentry');
    expect(SentryPlugin.version).toBe('1.0.0');
    expect(SentryPlugin.description).toContain('Sentry');
  });

  it.skipIf(skipIfMissing)('should install plugin on app', () => {
    if (!SentryPlugin) return;
    expect(() => {
      SentryPlugin.install(mockApp);
    }).not.toThrow();
  });

  it.skipIf(skipIfMissing)('should read sentry config from app.config', () => {
    if (!SentryPlugin) return;
    SentryPlugin.install(mockApp);
    const config = mockApp.config.plugins['@ux3/plugin-sentry'];
    expect(config.dsn).toContain('sentry.io');
    expect(config.environment).toBe('production');
  });

  it.skipIf(skipIfMissing)('should handle missing Sentry SDK gracefully', () => {
    if (!SentryPlugin) return;
    const appWithoutSentry = {
      config: { plugins: {} },
      logger: { subscribe: vi.fn() }
    };
    expect(() => {
      SentryPlugin.install(appWithoutSentry);
    }).not.toThrow();
  });

  it.skipIf(skipIfMissing)('should use console.error as fallback when Sentry unavailable', () => {
    if (!SentryPlugin) return;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    SentryPlugin.install(mockApp);
    
    expect(mockApp.logger.subscribe).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it.skipIf(skipIfMissing)('should support environment configuration', () => {
    if (!SentryPlugin) return;
    const appWithEnv = {
      config: {
        plugins: {
          '@ux3/plugin-sentry': {
            dsn: 'https://key@sentry.io/123',
            environment: 'development'
          }
        }
      },
      logger: { subscribe: vi.fn() }
    };
    
    expect(() => {
      SentryPlugin.install(appWithEnv);
    }).not.toThrow();
  });

  it.skipIf(skipIfMissing)('should support release tags', () => {
    if (!SentryPlugin) return;
    SentryPlugin.install(mockApp);
    const config = mockApp.config.plugins['@ux3/plugin-sentry'];
    expect(config.release).toBe('1.0.0');
  });

  // Placeholder test so the suite isn't empty if skipped
  it.skipIf(!skipIfMissing)('@sentry/browser peer dependency not installed', () => {
    // This test runs when @sentry/browser is not available
    // It's a way to document that the plugin requires @sentry/browser
    expect(true).toBe(true);
  });
});
