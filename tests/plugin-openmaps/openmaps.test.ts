import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenMapsPlugin } from '../../packages/@ux3/ux-openmaps/src/index';

describe('OpenMapsPlugin', () => {
  let mockApp: any;

  beforeEach(() => {
    delete (OpenMapsPlugin as any).config;
    mockApp = {
      config: {},
      registerService: vi.fn(),
      registerAsset: vi.fn(),
      utils: {},
    };
  });

  it('has expected metadata', () => {
    expect(OpenMapsPlugin.name).toBe('@ux3/ux-openmaps');
    expect(OpenMapsPlugin.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('registers Leaflet CSS and JS assets', () => {
    OpenMapsPlugin.install?.(mockApp);
    const assetCalls = mockApp.registerAsset.mock.calls.map((c: any[]) => c[0]);
    expect(assetCalls.some((a: any) => a.type === 'style' && a.href?.includes('leaflet.css'))).toBe(true);
    expect(assetCalls.some((a: any) => a.type === 'script' && a.src?.includes('leaflet.js'))).toBe(true);
  });

  it('registers map service', () => {
    OpenMapsPlugin.install?.(mockApp);
    expect(mockApp.registerService).toHaveBeenCalledWith('map', expect.any(Function));
  });

  it('exposes tile config on utils.openmaps', () => {
    (OpenMapsPlugin as any).config = {
      tileProvider: 'https://tile.example.com/{z}/{x}/{y}.png',
      tileAttribution: 'Test attribution',
      tileMaxZoom: 18,
    };
    OpenMapsPlugin.install?.(mockApp);
    expect(mockApp.utils.openmaps.tileProvider).toBe('https://tile.example.com/{z}/{x}/{y}.png');
    expect(mockApp.utils.openmaps.tileAttribution).toBe('Test attribution');
    expect(mockApp.utils.openmaps.tileMaxZoom).toBe(18);
  });

  it('uses OpenStreetMap tile defaults', () => {
    OpenMapsPlugin.install?.(mockApp);
    expect(mockApp.utils.openmaps.tileProvider).toContain('openstreetmap.org');
    expect(mockApp.utils.openmaps.tileMaxZoom).toBe(19);
  });

  it('map service throws when Leaflet is not loaded', () => {
    OpenMapsPlugin.install?.(mockApp);
    const factory = mockApp.registerService.mock.calls[0][1];
    const service = factory();
    expect(() => service.create(document.createElement('div'))).toThrow(
      /Leaflet is not loaded/
    );
  });

  it('supports custom cdn URL override', () => {
    (OpenMapsPlugin as any).config = { cdn: 'https://my-cdn.example.com/leaflet.js' };
    OpenMapsPlugin.install?.(mockApp);
    const assetCalls = mockApp.registerAsset.mock.calls.map((c: any[]) => c[0]);
    expect(assetCalls.some((a: any) => a.src === 'https://my-cdn.example.com/leaflet.js')).toBe(true);
  });
});
