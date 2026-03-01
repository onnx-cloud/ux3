import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

// ensure dev server serves dist assets for the real IAM example

describe('DevServer with IAM example', () => {
  it('should serve bundle.js from /dist after building', async () => {
    const projectDir = path.resolve('examples/iam');

    // build the example bundle using provided npm script
    // bundle script is defined in the workspace root package.json
    execSync('npm run bundle:iam', { cwd: path.resolve(__dirname, '../..'), stdio: 'inherit' });

    const { DevServer } = await import('@ux3/dev/dev-server.js');
    const server = new DevServer(projectDir, 3720, 'localhost');
    await server.start();

    // inform dev server about runtime bundle so it will inject tags
    const runtimeInfo: any = {
      bundle: '/dist/app.bundle.js',
      styles: [],
      version: require(path.join(projectDir, 'package.json')).version || '0.0.0',
      minified: true,
    };

    const configObj: any = { site: { runtime: { bundleKey: 'ux3.bundle', hydrationFn: 'initApp' } } };
    server.setManifest({ config: configObj, types: {}, invokes: {}, stats: { buildTime: 0 }, runtime: runtimeInfo });

    // after manifest has been set we can fetch and assert it contains styles
    const manifestResp = await fetch('http://localhost:3720/$/manifest');
    expect(manifestResp.status).toBe(200);
    const cfg: any = await manifestResp.json();
    // server returns the config object directly
    expect(cfg).toBeDefined();
    // styles object should exist and not be empty (IAM example has compositions)
    expect(cfg.styles).toBeDefined();
    expect(Object.keys(cfg.styles).length).toBeGreaterThan(0);
    try {
      const files = fs.readdirSync(path.join(projectDir, 'dist'));
      for (const f of files) {
        if (f.endsWith('.css')) runtimeInfo.styles.push(`/dist/${f}`);
      }
    } catch {}
    const url = 'http://localhost:3720/dist/app.bundle.js';
    const res = await fetch(url);
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') || '';
    expect(ct).toContain('javascript');

    // also request home page and ensure script tag present
    const home = await fetch('http://localhost:3720/');
    const html = await home.text();
    expect(html).toContain('data-ux3="app"');
    expect(html).toContain('type="module"');

    await server.stop();
  });
});
