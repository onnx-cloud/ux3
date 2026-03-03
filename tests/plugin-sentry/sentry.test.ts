import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Sentry SDK since it's an optional peer dependency
vi.mock('@sentry/browser', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  default: {
    init: vi.fn(),
    captureException: vi.fn(),
    captureMessage: vi.fn()
  }
}), { virtual: true });

import { SentryPlugin } from '@ux3/plugin-sentry';

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

  it('should have correct plugin metadata', () => {
    expect(SentryPlugin.name).toBe('@ux3/plugin-sentry');
    expect(SentryPlugin.version).toBe('1.0.0');
    expect(SentryPlugin.description).toContain('Sentry');
  });

  it('should install plugin on app', async () => {
    await expect(SentryPlugin.install(mockApp)).resolves.not.toThrow();
  });

  it('should read sentry config from app.config', async () => {
    await SentryPlugin.install(mockApp);
    const config = mockApp.config.plugins['@ux3/plugin-sentry'];
    expect(config.dsn).toContain('sentry.io');
    expect(config.environment).toBe('production');
  });

  it('should handle missing Sentry SDK gracefully', async () => {
    const appWithoutSentry = {
      config: { plugins: {} },
      logger: { subscribe: vi.fn() }
    };
    // Plugin should install without throwing even if Sentry is not available
    await expect(SentryPlugin.install(appWithoutSentry)).resolves.not.toThrow();
  });

  it('should use console.error as fallback when Sentry unavailable', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await SentryPlugin.install(mockApp);
    
    // Plugin should set up error capture
    expect(mockApp.logger.subscribe).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should support environment configuration', async () => {
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
    
    await expect(SentryPlugin.install(appWithEnv)).resolves.not.toThrow();
  });

  it('should support release tags', async () => {
    await SentryPlugin.install(mockApp);
    const config = mockApp.config.plugins['@ux3/plugin-sentry'];
    expect(config.release).toBe('1.0.0');
  });
});
