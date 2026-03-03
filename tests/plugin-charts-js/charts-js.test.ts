import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ChartsJsPlugin } from '@ux3/plugin-charts-js';

describe('ChartsJsPlugin', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      config: {},
      registerAsset: vi.fn(),
      registerService: vi.fn()
    };
  });

  it('should have correct plugin metadata', () => {
    expect(ChartsJsPlugin.name).toBe('@ux3/plugin-charts-js');
    expect(ChartsJsPlugin.version).toBe('0.1.0');
  });

  it('should install plugin and register assets', () => {
    ChartsJsPlugin.install(mockApp);
    expect(mockApp.registerAsset).toHaveBeenCalled();
  });

  it('should register chart service', () => {
    ChartsJsPlugin.install(mockApp);
    expect(mockApp.registerService).toHaveBeenCalled();
  });

  it('should register script asset for charts library', () => {
    ChartsJsPlugin.install(mockApp);
    const assetCall = mockApp.registerAsset.mock.calls[0]?.[0];
    expect(assetCall?.type).toBe('script');
    expect(assetCall?.src).toContain('charts');
  });

  it('should register chart service with create method', () => {
    ChartsJsPlugin.install(mockApp);
    const serviceCall = mockApp.registerService.mock.calls[0];
    expect(serviceCall?.[0]).toBe('chart');
    expect(typeof serviceCall?.[1]).toBe('function');
  });
});
