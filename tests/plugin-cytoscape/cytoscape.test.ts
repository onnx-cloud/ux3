import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CytoscapePlugin } from '../../packages/@ux3/ux-cytoscape/src/index';

describe('CytoscapePlugin', () => {
  let mockApp: any;

  beforeEach(() => {
    delete (CytoscapePlugin as any).config;
    mockApp = {
      config: {},
      registerService: vi.fn(),
      registerAsset: vi.fn(),
      utils: {},
    };
  });

  it('has expected metadata', () => {
    expect(CytoscapePlugin.name).toBe('@ux3/ux-cytoscape');
    expect(CytoscapePlugin.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('registers Cytoscape.js CDN script asset', () => {
    CytoscapePlugin.install?.(mockApp);
    const assetCalls = mockApp.registerAsset.mock.calls.map((c: any[]) => c[0]);
    expect(assetCalls.some((a: any) => a.type === 'script' && a.src?.includes('cytoscape'))).toBe(true);
  });

  it('registers graph service', () => {
    CytoscapePlugin.install?.(mockApp);
    expect(mockApp.registerService).toHaveBeenCalledWith('graph', expect.any(Function));
  });

  it('exposes cdn on utils.cytoscape', () => {
    CytoscapePlugin.install?.(mockApp);
    expect(mockApp.utils.cytoscape.cdn).toContain('cytoscape');
  });

  it('supports custom cdn URL override', () => {
    (CytoscapePlugin as any).config = { cdn: 'https://my-cdn.example.com/cytoscape.min.js' };
    CytoscapePlugin.install?.(mockApp);
    const assetCalls = mockApp.registerAsset.mock.calls.map((c: any[]) => c[0]);
    expect(assetCalls[0].src).toBe('https://my-cdn.example.com/cytoscape.min.js');
  });

  it('graph service create throws when Cytoscape.js is not loaded', () => {
    CytoscapePlugin.install?.(mockApp);
    const factory = mockApp.registerService.mock.calls[0][1];
    const service = factory();
    expect(() => service.create(document.createElement('div'))).toThrow(/not loaded/);
  });

  it('graph service creates instance when cytoscape global is present', () => {
    const mockCytoscape = vi.fn().mockReturnValue({ id: 'cy-instance' });
    (globalThis as any).window = { cytoscape: mockCytoscape };

    CytoscapePlugin.install?.(mockApp);
    const factory = mockApp.registerService.mock.calls[0][1];
    const service = factory();
    const el = document.createElement('div');
    const result = service.create(el, { elements: [] });

    expect(mockCytoscape).toHaveBeenCalledWith(expect.objectContaining({ container: el }));
    expect(result).toEqual({ id: 'cy-instance' });

    delete (globalThis as any).window;
  });
});
