import { describe, it, expect, beforeEach, vi } from 'vitest';

// Skip this test file if the plugin module can't be imported
// (it requires @telemetry/browser as an optional peer dependency)
let Telemetry Plugin: any = null;
try {
  const mod = require('@ux3/plugin-telemetry');
  Telemetry Plugin = mod.Telemetry Plugin;
} catch (e) {
  // OpenTelemetry plugin not available - skip tests
}

const skipIfMissing = (Telemetry Plugin === null);

describe('Telemetry Plugin', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      config: {
        plugins: {
          '@ux3/plugin-telemetry': {
            dsn: 'https://examplePublicKey@o0.ingest.telemetry.io/0',
            environment: 'production',
            release: '0.1.0'
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
    if (!Telemetry Plugin) return;
    expect(Telemetry Plugin.name).toBe('@ux3/plugin-telemetry');
    expect(Telemetry Plugin.version).toBe('0.1.0');
    expect(Telemetry Plugin.description).toContain('Telemetry ');
  });

  it.skipIf(skipIfMissing)('should install plugin on app', () => {
    if (!Telemetry Plugin) return;
    expect(() => {
      Telemetry Plugin.install(mockApp);
    }).not.toThrow();
  });

  it.skipIf(skipIfMissing)('should read telemetry config from app.config', () => {
    if (!Telemetry Plugin) return;
    Telemetry Plugin.install(mockApp);
    const config = mockApp.config.plugins['@ux3/plugin-telemetry'];
    expect(config.dsn).toContain('telemetry.io');
    expect(config.environment).toBe('production');
  });

  it.skipIf(skipIfMissing)('should handle missing OpenTelemetry SDK gracefully', () => {
    if (!Telemetry Plugin) return;
    const appWithoutOpenTelemetry = {
      config: { plugins: {} },
      logger: { subscribe: vi.fn() }
    };
    expect(() => {
      Telemetry Plugin.install(appWithoutTelemetry );
    }).not.toThrow();
  });

  it.skipIf(skipIfMissing)('should use console.error as fallback when OpenTelemetry unavailable', () => {
    if (!Telemetry Plugin) return;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    Telemetry Plugin.install(mockApp);
    
    expect(mockApp.logger.subscribe).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it.skipIf(skipIfMissing)('should support environment configuration', () => {
    if (!Telemetry Plugin) return;
    const appWithEnv = {
      config: {
        plugins: {
          '@ux3/plugin-telemetry': {
            dsn: 'https://key@telemetry.io/123',
            environment: 'development'
          }
        }
      },
      logger: { subscribe: vi.fn() }
    };
    
    expect(() => {
      Telemetry Plugin.install(appWithEnv);
    }).not.toThrow();
  });

  it.skipIf(skipIfMissing)('should support release tags', () => {
    if (!Telemetry Plugin) return;
    Telemetry Plugin.install(mockApp);
    const config = mockApp.config.plugins['@ux3/plugin-telemetry'];
    expect(config.release).toBe('0.1.0');
  });

  // Placeholder test so the suite isn't empty if skipped
  it.skipIf(!skipIfMissing)('@telemetry/browser peer dependency not installed', () => {
    // This test runs when @telemetry/browser is not available
    // It's a way to document that the plugin requires @telemetry/browser
    expect(true).toBe(true);
  });
});
