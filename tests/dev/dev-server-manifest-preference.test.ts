import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('DevServer manifest preference', () => {
  it('serves manifest template for index even when source exists', async () => {
    const tmpRoot = path.join(process.cwd(), 'tmp');
    await fs.ensureDir(tmpRoot);
    const temp = path.join(tmpRoot, `ux3-devserver-${Date.now()}`);
    await fs.ensureDir(temp);
    await fs.ensureDir(path.join(temp, 'ux', 'view'));

    // create index.yaml referencing view/home/index.html
    await fs.writeFile(
      path.join(temp, 'ux', 'view', 'index.yaml'),
      `name: index\ninitial: index\nstates:\n  index:\n    template: 'view/home/index.html'\n`
    );

    // create source template that should be *ignored* when manifest exists
    await fs.ensureDir(path.join(temp, 'ux', 'view', 'home'));
    await fs.writeFile(path.join(temp, 'ux', 'view', 'home', 'index.html'), `<div id="view">FS</div>`);

    // Start server and set manifest with compiled template containing app wrapper
    const { DevServer } = await import('@ux3/dev/dev-server');
    const server = new DevServer(temp, 3620, 'localhost');
    await server.start();

    server.setManifest({ config: { templates: { home: { index: '<div id="app">MANIFEST</div>' } } }, types: {}, invokes: {}, stats: { buildTime: 0 } });

    const res = await fetch('http://localhost:3620/');
    const html = await res.text();

    expect(html).toContain('<div id="app">MANIFEST</div>');
    expect(html).not.toContain('FS');

    await server.stop();
    await fs.remove(temp);
  });

  it('serves manifest template for route when available', async () => {
    const tmpRoot = path.join(process.cwd(), 'tmp');
    await fs.ensureDir(tmpRoot);
    const temp = path.join(tmpRoot, `ux3-devserver-${Date.now()}`);
    await fs.ensureDir(temp);
    await fs.ensureDir(path.join(temp, 'ux', 'view'));

    // create view yaml and source template
    await fs.writeFile(
      path.join(temp, 'ux', 'view', 'home.yaml'),
      `template: 'view/home/index.html'\n`
    );
    await fs.ensureDir(path.join(temp, 'ux', 'view', 'home'));
    await fs.writeFile(path.join(temp, 'ux', 'view', 'home', 'index.html'), `<div id="view">FS</div>`);

    const { DevServer } = await import('@ux3/dev/dev-server');
    const server = new DevServer(temp, 3621, 'localhost');
    await server.start();

    // set routes and compiled template
    server.setManifest({ config: { routes: [{ path: '/home', view: 'home' }], templates: { home: { index: '<div id="app">MANIFEST</div>' } } }, types: {}, invokes: {}, stats: { buildTime: 0 } });

    const res = await fetch('http://localhost:3621/home');
    const html = await res.text();

    expect(html).toContain('<div id="app">MANIFEST</div>');
    expect(html).not.toContain('FS');

    await server.stop();
    await fs.remove(temp);
  });
});
