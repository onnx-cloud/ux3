import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IconesPlugin } from '../../packages/@ux3/ux-icones/src/index';

describe('IconesPlugin', () => {
  let mockApp: any;

  beforeEach(() => {
    delete (IconesPlugin as any).config;
    mockApp = {
      config: {},
      registerService: vi.fn(),
      utils: {}
    };
  });

  it('has expected metadata', () => {
    expect(IconesPlugin.name).toBe('@ux3/ux-icones');
    expect(IconesPlugin.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('exposes bundled/cached defaults', () => {
    IconesPlugin.install?.(mockApp);
    expect(mockApp.utils.icones.bundled).toBe(true);
    expect(mockApp.utils.icones.cached).toBe(true);
  });

  it('normalizes unqualified icon names to lucide collection', () => {
    IconesPlugin.install?.(mockApp);
    const html = mockApp.utils.icones.icon('camera');
    expect(html).toContain('<ux-icon');
    expect(html).toContain('name="lucide:camera"');
  });

  it('keeps fully-qualified icon names unchanged', () => {
    IconesPlugin.install?.(mockApp);
    const html = mockApp.utils.icones.icon('mdi:account');
    expect(html).toContain('name="mdi:account"');
  });

  it('registers icones service', () => {
    IconesPlugin.install?.(mockApp);
    expect(mockApp.registerService).toHaveBeenCalledWith('icones', expect.any(Function));
  });

  it('supports overriding default collection', () => {
    (IconesPlugin as any).config = {
      defaultCollection: 'ph'
    };
    IconesPlugin.install?.(mockApp);
    const html = mockApp.utils.icones.icon('alarm');
    expect(html).toContain('name="ph:alarm"');
  });

  it('supports collections from plugin entry config', () => {
    (IconesPlugin as any).config = {
      collections: ['lucide'],
      bundled: true,
      cached: true
    };
    IconesPlugin.install?.(mockApp);
    expect(mockApp.utils.icones.collections).toEqual(['lucide']);
  });
});
