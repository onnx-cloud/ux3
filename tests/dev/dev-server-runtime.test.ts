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
    const temp = path.join(os.tmpdir(), `ux3-devserver-${Date.now()}`);
    await fs.ensureDir(temp);
    await fs.ensureDir(path.join(temp, 'ux', 'view'));

    // minimal index.yaml
    await fs.writeFile(
      path.join(temp, 'ux', 'view', 'index.yaml'),
      `name: index\ninitial: index\nstates:\n  index:\n    template: 'view/home/index.html'\n`
    );
    await fs.ensureDir(path.join(temp, 'ux', 'view', 'home'));
    await fs.writeFile(path.join(temp, 'ux', 'view', 'home', 'index.html'), `<div id="app">HELLO</div>`);

    const { DevServer } = await import('@ux3/dev/dev-server.js');
    const server = new DevServer(temp, 3700, 'localhost');
    await server.start();

    // create synthetic manifest containing runtime info and runtime config
    const runtimeInfo = {
      bundle: '/dist/ux3.bundle.js',
      styles: ['/dist/ux3.tokens.css'],
      version: '9.9.9',
      minified: true,
    };

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

    expect(html).toContain('data-ux3="styles"');
    expect(html).toContain('data-ux3="app"');
    expect(html).toContain('data-ux3="hydration"');
    expect(html).toContain('/dist/ux3.bundle.js');

    await server.stop();
    await fs.remove(temp);
  });
});
