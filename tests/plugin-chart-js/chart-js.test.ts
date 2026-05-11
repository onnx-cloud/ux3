import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChartJsPlugin } from '../../packages/@ux3/plugin-chart-js/src/index';

const origDefine = customElements.define.bind(customElements);

describe('ChartJsPlugin', () => {
  let mockApp: any;

  beforeEach(() => {
    delete (ChartJsPlugin as any).config;
    mockApp = {
      config: {},
      registerService: vi.fn(),
      registerAsset: vi.fn(),
      utils: {},
    };
  });

  it('has expected metadata', () => {
    expect(ChartJsPlugin.name).toBe('@ux3/plugin-chart-js');
    expect(ChartJsPlugin.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('registers Chart.js CDN script asset', () => {
    ChartJsPlugin.install?.(mockApp);
    const assetCalls = mockApp.registerAsset.mock.calls.map((c: any[]) => c[0]);
    expect(assetCalls.some((a: any) => a.type === 'script' && a.src?.includes('chart.js'))).toBe(true);
  });

  it('registers chart service', () => {
    ChartJsPlugin.install?.(mockApp);
    expect(mockApp.registerService).toHaveBeenCalledWith('chart', expect.any(Function));
  });

  it('exposes cdn on utils.chart', () => {
    ChartJsPlugin.install?.(mockApp);
    expect(mockApp.utils.chart.cdn).toContain('chart.js');
  });

  it('supports custom cdn URL override', () => {
    (ChartJsPlugin as any).config = { cdn: 'https://my-cdn.example.com/chart.min.js' };
    ChartJsPlugin.install?.(mockApp);
    const assetCalls = mockApp.registerAsset.mock.calls.map((c: any[]) => c[0]);
    expect(assetCalls[0].src).toBe('https://my-cdn.example.com/chart.min.js');
  });

  it('chart service create throws when element not found', async () => {
    (globalThis as any).window = { Chart: class MockChart {} };
    ChartJsPlugin.install?.(mockApp);
    const factory = mockApp.registerService.mock.calls[0][1];
    const service = factory();
    await expect(service.create('#nonexistent', { type: 'bar', data: {} })).rejects.toThrow(
      /target element not found/
    );
    delete (globalThis as any).window;
  });
});
