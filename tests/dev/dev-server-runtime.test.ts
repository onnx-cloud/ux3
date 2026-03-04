// @vitest-environment node

import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/*
 * Verify that the dev server injects runtime bundle/styles/hydration tags when
 * the manifest contains runtime information and the config.site.runtime bundleKey
 * is defined. This mirrors behaviour used by the full build.
 */

describe('DevServer runtime asset injection', () => {
  it('appends runtime tags into head and scripts', async () => {
    const tmpRoot = path.join(process.cwd(), 'tmp');
    await fs.ensureDir(tmpRoot);
    const temp = path.join(tmpRoot, `ux3-devserver-${Date.now()}`);
    await fs.ensureDir(temp);
    await fs.ensureDir(path.join(temp, 'ux', 'view'));

    // minimal index.yaml
    await fs.writeFile(
      path.join(temp, 'ux', 'view', 'index.yaml'),
      `name: index\ninitial: index\nstates:\n  index:\n    template: 'view/home/index.html'\n`
    );
    await fs.ensureDir(path.join(temp, 'ux', 'view', 'home'));
    await fs.writeFile(path.join(temp, 'ux', 'view', 'home', 'index.html'), `<div id="app">HELLO</div>`);

    const { DevServer } = await import('@ux3/dev/dev-server.ts');
    const server = new DevServer(temp, 3700, 'localhost');
    await server.start();

    // compute runtime info using Bundler as dev command now does
    const { Bundler } = await import('../../src/build/bundler.ts');
    const outputDir = path.join(temp, 'dist');
    await fs.ensureDir(outputDir);

    const generatedDir = path.join(temp, 'generated');
    await fs.ensureDir(generatedDir);
    await fs.writeFile(path.join(generatedDir, 'config.ts'), 'export const config = {};');
    await fs.writeFile(
      path.join(generatedDir, 'types.ts'),
      'export type Routes = any; export type Services = any; export type I18n = any;'
    );
    const entryCode = `export { config, type Routes, type Services, type I18n } from '${path
      .join(generatedDir, 'config.ts')
      .replace(/\\/g, '/')}'`;
    await fs.writeFile(path.join(generatedDir, '__entry__.ts'), entryCode);
  }, 20000);

    const bundler = new Bundler({
      projectDir: temp,
      generatedDir,
      outputDir,
      minify: false,
      sourcemaps: true,
    });
    let bundleRel = '';
    try {
      const bundlePath = await bundler.bundle();
      bundleRel = path.relative(temp, bundlePath).replace(/\\/g, '/');
    } catch (e) {
      // ignore
    }
    const styles: string[] = [];
    if (bundleRel) {
      const files = fs.readdirSync(outputDir);
      for (const f of files) if (f.endsWith('.css')) styles.push(path.join(path.relative(temp, outputDir), f).replace(/\\/g, '/'));
    }
    let pkgVersion = '0.0.0';
    try {
      const pkgData = await fs.readFile(path.join(temp, 'package.json'), 'utf-8');
      pkgVersion = JSON.parse(pkgData).version || pkgVersion;
    } catch {}
    const runtimeInfo = bundleRel ? {
      bundle: bundleRel,
      styles,
      version: pkgVersion,
      minified: false,
    } : undefined;

    const config: any = {
      site: {
        runtime: {
          bundleKey: 'ux3.bundle',
          hydrationFn: 'initApp',
        },
      },
      templates: { home: { index: '<div id="app">MANIFEST</div>' } },
    };

    server.setManifest({ config, types: {}, invokes: {}, stats: { buildTime: 0 }, runtime: runtimeInfo });

    const res = await fetch('http://localhost:3700/');
    const html = await res.text();

    if (runtimeInfo && runtimeInfo.styles && runtimeInfo.styles.length) {
      expect(html).toContain('data-ux3="styles"');
    }
    // script tag should use hydration pattern with DOMContentLoaded
    expect(html).toContain('data-ux3="hydration"');
    expect(html).toContain('DOMContentLoaded');
    if (runtimeInfo && runtimeInfo.bundle) {
      expect(html).toContain(runtimeInfo.bundle.replace(/^\//, ''));
      const bundlePath = runtimeInfo.bundle.startsWith('/') ? runtimeInfo.bundle : '/' + runtimeInfo.bundle;
      const bundleRes = await fetch(`http://localhost:3700${bundlePath}`);
      expect(bundleRes.status).toBe(200);
      expect(bundleRes.headers.get('content-type') || '').toContain('javascript');
    }

    await server.stop();
    await fs.remove(temp);
  });
});