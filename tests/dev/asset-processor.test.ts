import { describe, it, expect } from 'vitest';
import { processAssets } from '../../src/dev/asset-processor.js';

// simple fake manifest with runtime data
const fakeManifest: any = {
  config: {
    site: {
      assets: [
        { type: 'script', src: '/foo.js', defer: true },
        { type: 'style', href: '/bar.css' },
      ],
      runtime: {
        bundleKey: 'ux3.bundle',
        hydrationFn: 'initApp',
      },
    },
  },
  runtime: {
    bundle: '/dist/ux3.bundle.js',
    styles: ['/dist/ux3.tokens.css'],
    version: '0.0.1',
    minified: false,
  },
};

describe('processAssets helper', () => {
  it('should return head and script markup for assets and runtime', () => {
    const site = processAssets(fakeManifest, '/fake');

    expect(site.head).toContain('<link rel="stylesheet" href="/bar.css"');
    expect(site.scripts).toContain('<script src="/foo.js"');
    // runtime injected
    expect(site.head).toContain('data-ux3="styles"');
    expect(site.scripts).toContain('data-ux3="app"');
    expect(site.scripts).toContain('data-ux3="hydration"');
    expect(site.scripts).toContain('initApp');
  });

  it('should handle missing runtime gracefully', () => {
    const m = { config: { site: { assets: [] } } };
    const site = processAssets(m as any, '/');
    expect(site.head).toBe('');
    expect(site.scripts).toBe('');
  });
});
