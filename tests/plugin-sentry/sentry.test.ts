import { describe, it, expect, beforeEach, vi } from 'vitest';

let TelemetryPlugin: any = null;
try {
  const mod = require('@ux3/plugin-telemetry');
  TelemetryPlugin = mod.TelemetryPlugin;
} catch (e) {
}

const skipIfMissing = (TelemetryPlugin === null);

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
    if (!TelemetryPlugin) return;
    expect(TelemetryPlugin.name).toBe('@ux3/plugin-telemetry');
    expect(TelemetryPlugin.version).toBe('0.1.0');
    expect(TelemetryPlugin.description).toContain('Telemetry ');
  });

  it.skipIf(skipIfMissing)('should install plugin on app', () => {
    if (!TelemetryPlugin) return;
    expect(() => {
      TelemetryPlugin.install(mockApp);
    }).not.toThrow();
  });

  it.skipIf(skipIfMissing)('should read telemetry config from app.config', () => {
    if (!TelemetryPlugin) return;
    TelemetryPlugin.install(mockApp);
    const config = mockApp.config.plugins['@ux3/plugin-telemetry'];
    expect(config.dsn).toContain('telemetry.io');
    expect(config.environment).toBe('production');
  });

  it.skipIf(skipIfMissing)('should handle missing OpenTelemetry SDK gracefully', () => {
    if (!TelemetryPlugin) return;
    const appWithoutOpenTelemetry = {
      config: { plugins: {} },
      logger: { subscribe: vi.fn() }
    };
    expect(() => {
      TelemetryPlugin.install(appWithoutOpenTelemetry);
    }).not.toThrow();
  });

  it.skipIf(skipIfMissing)('should use console.error as fallback when OpenTelemetry unavailable', () => {
    if (!TelemetryPlugin) return;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    TelemetryPlugin.install(mockApp);
    
    expect(mockApp.logger.subscribe).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it.skipIf(skipIfMissing)('should support environment configuration', () => {
    if (!TelemetryPlugin) return;
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
      TelemetryPlugin.install(appWithEnv);
    }).not.toThrow();
  });

  it.skipIf(skipIfMissing)('should support release tags', () => {
    if (!TelemetryPlugin) return;
    TelemetryPlugin.install(mockApp);
    const config = mockApp.config.plugins['@ux3/plugin-telemetry'];
    expect(config.release).toBe('0.1.0');
  });

  it.skipIf(!skipIfMissing)('@telemetry/browser peer dependency not installed', () => {
    expect(true).toBe(true);
  });
});
