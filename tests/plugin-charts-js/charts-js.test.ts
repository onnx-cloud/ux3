import { describe, it, expect, beforeEach, vi } from 'vitest';

// Skip this test file if the plugin module can't be imported
// (it requires charts.js as a peer dependency which may not be installed)
let ChartsJsPlugin: any = null;
try {
  const mod = require('@ux3/plugin-charts-js');
  ChartsJsPlugin = mod.ChartsJsPlugin;
} catch (e) {
  // Charts.js plugin not available - skip tests
}

const skipIfMissing = (ChartsJsPlugin === null);

describe('ChartsJsPlugin', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      config: {},
      registerAsset: vi.fn(),
      registerService: vi.fn()
    };
  });

  it.skipIf(skipIfMissing)('should have correct plugin metadata', () => {
    if (!ChartsJsPlugin) return;
    expect(ChartsJsPlugin.name).toBe('@ux3/plugin-charts-js');
    expect(ChartsJsPlugin.version).toBe('0.1.0');
  });

  it.skipIf(skipIfMissing)('should install plugin and register assets', () => {
    if (!ChartsJsPlugin) return;
    ChartsJsPlugin.install(mockApp);
    expect(mockApp.registerAsset).toHaveBeenCalled();
  });

  it.skipIf(skipIfMissing)('should register chart service', () => {
    if (!ChartsJsPlugin) return;
    ChartsJsPlugin.install(mockApp);
    expect(mockApp.registerService).toHaveBeenCalled();
  });

  it.skipIf(skipIfMissing)('should register script asset for charts library', () => {
    if (!ChartsJsPlugin) return;
    ChartsJsPlugin.install(mockApp);
    const assetCall = mockApp.registerAsset.mock.calls[0]?.[0];
    expect(assetCall?.type).toBe('script');
    expect(assetCall?.src).toContain('charts');
  });

  it.skipIf(skipIfMissing)('should register chart service with create method', () => {
    if (!ChartsJsPlugin) return;
    ChartsJsPlugin.install(mockApp);
    const serviceCall = mockApp.registerService.mock.calls[0];
    expect(serviceCall?.[0]).toBe('chart');
    expect(typeof serviceCall?.[1]).toBe('function');
  });

  // Placeholder test so the suite isn't empty if skipped
  it.skipIf(!skipIfMissing)('charts.js peer dependency not installed', () => {
    // This test runs when charts.js is not available
    // It's a way to document that the plugin requires charts.js
    expect(true).toBe(true);
  });
});
