import { describe, it, expect } from 'vitest';
import { processAssets } from '../../src/dev/asset-processor.js';
// simple fake manifest with runtime data
const fakeManifest = {
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
        const site = processAssets(m, '/');
        expect(site.head).toBe('');
        expect(site.scripts).toBe('');
    });
});
// ---------------------------------------------------------------------------
// Regression: "bundle pending" placeholder
//
// When bundleKey is set but the bundler failed silently, bundleUrl is empty
// and the asset-processor must emit the placeholder comment so the markup is
// at least identifiable in the DOM.  A REAL hydration script must be produced
// once bundleUrl is non-empty.
// ---------------------------------------------------------------------------
describe('processAssets: bundle-pending regression', () => {
    const bundleKeyManifest = (bundleUrl) => ({
        config: {
            site: {
                assets: [],
                runtime: { bundleKey: 'ux3.bundle', hydrationFn: 'initApp' },
            },
        },
        runtime: bundleUrl
            ? { bundle: bundleUrl, styles: [], version: '1.0.0', minified: false }
            : undefined,
    });
    it('emits /* initApp – bundle pending */ comment when bundleUrl is empty', () => {
        // This is the exact symptom that revealed the @ux3/ui resolution bug.
        const site = processAssets(bundleKeyManifest(''), '/proj');
        expect(site.scripts).toContain('/* initApp – bundle pending */');
        // Must NOT contain a real import() – there is no bundle to import
        expect(site.scripts).not.toContain('import(');
    });
    it('emits real dynamic import() when bundleUrl is non-empty', () => {
        const site = processAssets(bundleKeyManifest('/dist/bundle.js'), '/proj');
        expect(site.scripts).not.toContain('bundle pending');
        expect(site.scripts).toContain("import('/dist/bundle.js");
        expect(site.scripts).toContain('initApp');
        // Hydration wraps in DOMContentLoaded listener
        expect(site.scripts).toContain('DOMContentLoaded');
    });
    it('prepends "/" to bundleUrl that lacks a leading slash', () => {
        // Dev command stores bundleRel as a relative path like "dist/bundle.js"
        const site = processAssets(bundleKeyManifest('dist/bundle.js'), '/proj');
        expect(site.scripts).toContain("import('/dist/bundle.js");
        // Should not double-slash
        expect(site.scripts).not.toContain("import('//dist");
    });
    it('does not double-slash a bundleUrl that already starts with "/"', () => {
        const site = processAssets(bundleKeyManifest('/dist/bundle.js'), '/proj');
        expect(site.scripts).not.toContain("import('//dist");
        expect(site.scripts).toContain("import('/dist/bundle.js");
    });
    it('appends a cache-busting ?ts= query to the hydration import URL', () => {
        const site = processAssets(bundleKeyManifest('/dist/bundle.js'), '/proj');
        expect(site.scripts).toMatch(/import\('\/dist\/bundle\.js\?ts=\d+/);
    });
    it('emits <script type="module" data-ux3="app"> tag regardless of bundleUrl', () => {
        const emptyBundle = processAssets(bundleKeyManifest(''), '/proj');
        const realBundle = processAssets(bundleKeyManifest('/dist/bundle.js'), '/proj');
        // app tag always present when bundleKey is configured
        expect(emptyBundle.scripts).toContain('data-ux3="app"');
        expect(realBundle.scripts).toContain('data-ux3="app"');
        // When bundle is real, the src attr is set
        expect(realBundle.scripts).toContain('src="/dist/bundle.js"');
        // When bundle is missing, no src attr
        expect(emptyBundle.scripts).not.toContain('src=');
    });
    it('emits no injection tags when bundleKey is absent', () => {
        const noRuntime = { config: { site: { assets: [] } } };
        const site = processAssets(noRuntime, '/proj');
        expect(site.scripts).not.toContain('data-ux3="app"');
        expect(site.scripts).not.toContain('data-ux3="hydration"');
        expect(site.scripts).not.toContain('bundle pending');
    });
    it('uses custom hydrationFn name in placeholder and real script', () => {
        const customFnManifest = {
            config: {
                site: {
                    assets: [],
                    runtime: { bundleKey: 'ux3.bundle', hydrationFn: 'bootMyApp' },
                },
            },
            runtime: undefined,
        };
        const emptyBundle = processAssets(customFnManifest, '/proj');
        expect(emptyBundle.scripts).toContain('/* bootMyApp – bundle pending */');
        customFnManifest.runtime = { bundle: '/dist/b.js', styles: [], version: '1', minified: false };
        const realBundle = processAssets(customFnManifest, '/proj');
        expect(realBundle.scripts).toContain('m.bootMyApp');
    });
});
//# sourceMappingURL=asset-processor.test.js.map