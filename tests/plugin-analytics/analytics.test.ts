import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsPlugin } from '@ux3/plugin-analytics';

describe('AnalyticsPlugin', () => {
  let mockApp: any;

  beforeEach(() => {
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
        subscribe: vi.fn()
      }
    };
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
      config: { plugins: {} },
      logger: { subscribe: vi.fn() }
    };
    expect(() => {
      AnalyticsPlugin.install(appWithDefaults);
    }).not.toThrow();
  });

  it('should subscribe to logger', () => {
    AnalyticsPlugin.install(mockApp);
    expect(mockApp.logger.subscribe).toHaveBeenCalled();
  });
});
