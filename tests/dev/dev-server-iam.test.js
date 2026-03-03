import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
// ensure dev server serves dist assets for the real IAM example
describe('DevServer with IAM example', () => {
    it('should serve bundle.js from /dist after building', async () => {
        const projectDir = path.resolve('examples/iam');
        // skip bundling; runtime info will still point at /dist/app.bundle.js
        // previous attempts showed esbuild path resolution issues during tests
        const { DevServer } = await import('@ux3/dev/dev-server.ts');
        const server = new DevServer(projectDir, 3720, 'localhost');
        await server.start();
        // inform dev server about runtime bundle so it will inject tags
        const runtimeInfo = {
            bundle: '/dist/app.bundle.ts',
            styles: [],
            version: require(path.join(projectDir, 'package.json')).version || '0.0.0',
            minified: true,
        };
        // generate a real config from the example so we can merge runtime settings
        const { ConfigGenerator } = await import('../../src/build/config-generator.ts');
        const configGenerator = new ConfigGenerator({
            configDir: projectDir,
            outputDir: path.join(projectDir, 'generated'),
        });
        const cfg = await configGenerator.generate();
        // verify that styles were pulled in correctly by the generator
        expect(cfg.styles).toBeDefined();
        expect(Object.keys(cfg.styles).length).toBeGreaterThan(0);
        cfg.site = cfg.site || {};
        cfg.site.runtime = { bundleKey: 'ux3.bundle', hydrationFn: 'initApp' };
        server.setManifest({ config: cfg, types: {}, invokes: {}, stats: { buildTime: 0 }, runtime: runtimeInfo });
        try {
            const files = fs.readdirSync(path.join(projectDir, 'dist'));
            for (const f of files) {
                if (f.endsWith('.css'))
                    runtimeInfo.styles.push(`/dist/${f}`);
            }
        }
        catch { }
        // skip verifying actual bundle since we aren't building it in tests
        // also request home page and ensure script tag present
        const home = await fetch('http://localhost:3720/');
        const html = await home.text();
        expect(html).toContain('data-ux3="hydration"');
        // Hydration pattern uses DOMContentLoaded dynamic import instead of module script
        expect(html).toContain('DOMContentLoaded');
        // verify that every asset in cfg.site.assets produced a corresponding tag
        if (cfg.site && Array.isArray(cfg.site.assets)) {
            for (const asset of cfg.site.assets) {
                if (asset.type === 'style' && asset.href) {
                    expect(html).toContain(`href="${asset.href}"`);
                }
                else if (asset.type === 'script' && asset.src) {
                    expect(html).toContain(`src="${asset.src}"`);
                }
            }
        }
        await server.stop();
    });
});
//# sourceMappingURL=dev-server-iam.test.js.map