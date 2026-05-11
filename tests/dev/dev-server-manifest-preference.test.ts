import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';

describe('DevServer template resolution (filesystem-first)', () => {
  it('serves filesystem template even when manifest exists (index view)', async () => {
    const tmpRoot = path.join(process.cwd(), 'tmp');
    await fs.ensureDir(tmpRoot);
    const temp = path.join(tmpRoot, `ux3-devserver-${Date.now()}`);
    await fs.ensureDir(temp);
    await fs.ensureDir(path.join(temp, 'ux', 'widget'));
    await fs.ensureDir(path.join(temp, 'ux', 'widget', 'home'));

    await fs.writeFile(path.join(temp, 'ux', 'widget', 'home', 'index.html'), `<div id="view">FS</div>`);
    await fs.writeFile(
      path.join(temp, 'ux', 'widget', 'index.yaml'),
      `name: index\ninitial: index\nstates:\n  index:\n    template: 'widget/home/index.html'\n`
    );

    const { DevServer } = await import('@ux3/dev/dev-server');
    const server = new DevServer(temp, 3640, 'localhost');
    await server.start();

    server.setManifest({ config: { templates: { home: { index: '<div id="app">MANIFEST</div>' } } }, types: {}, invokes: {}, stats: { buildTime: 0 } });

    const res = await fetch('http://localhost:3640/');
    const html = await res.text();

    expect(html).toContain('<div id="view">FS</div>');
    expect(html).not.toContain('<div id="app">MANIFEST</div>');

    await server.stop();
    await fs.remove(temp);
  });

  it('serves filesystem template for route even when manifest exists', async () => {
    const tmpRoot = path.join(process.cwd(), 'tmp');
    await fs.ensureDir(tmpRoot);
    const temp = path.join(tmpRoot, `ux3-devserver-${Date.now()}`);
    await fs.ensureDir(temp);
    await fs.ensureDir(path.join(temp, 'ux', 'widget'));
    await fs.ensureDir(path.join(temp, 'ux', 'widget', 'home'));

    await fs.writeFile(
      path.join(temp, 'ux', 'widget', 'home.yaml'),
      `template: 'widget/home/index.html'\n`
    );
    await fs.writeFile(path.join(temp, 'ux', 'widget', 'home', 'index.html'), `<div id="view">FS</div>`);

    const { DevServer } = await import('@ux3/dev/dev-server');
    const server = new DevServer(temp, 3641, 'localhost');
    await server.start();

    server.setManifest({ config: { routes: [{ path: '/home', view: 'home' }], templates: { home: { index: '<div id="app">MANIFEST</div>' } } }, types: {}, invokes: {}, stats: { buildTime: 0 } });

    const res = await fetch('http://localhost:3641/home');
    const html = await res.text();

    expect(html).toContain('<div id="view">FS</div>');
    expect(html).not.toContain('<div id="app">MANIFEST</div>');

    await server.stop();
    await fs.remove(temp);
  });
});
