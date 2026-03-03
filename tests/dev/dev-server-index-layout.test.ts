import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('DevServer index layout resolution', () => {
  it('should use declared layout for index view', async () => {
    const tmpRoot = path.join(process.cwd(), 'tmp');
    await fs.ensureDir(tmpRoot);
    const temp = path.join(tmpRoot, `ux3-devserver-${Date.now()}`);
    await fs.ensureDir(temp);
    await fs.ensureDir(path.join(temp, 'ux', 'view'));
    await fs.ensureDir(path.join(temp, 'ux', 'layout'));

    // layout that wraps site.template
    const layoutHtml = `<html><head></head><body><div id="layout">{{site.template}}</div></body></html>`;
    await fs.writeFile(path.join(temp, 'ux', 'layout', 'default.html'), layoutHtml);

    // create view template
    await fs.ensureDir(path.join(temp, 'ux', 'view', 'home'));
    await fs.writeFile(path.join(temp, 'ux', 'view', 'home', 'index.html'), `<div id="view">HELLO</div>`);

    // create index.yaml that references the view and declares layout: default
    await fs.writeFile(path.join(temp, 'ux', 'view', 'index.yaml'), `name: index\ninitial: index\nstates:\n  index:\n    template: 'view/home/index.html'\nlayout: default\n`);

    const { DevServer } = await import('@ux3/dev/dev-server.ts');
    const server = new DevServer(temp, 3610, 'localhost');
    await server.start();

    const res = await fetch('http://localhost:3610/');
    const html = await res.text();

    expect(html).toContain('<div id="layout">');
    expect(html).toContain('<div id="view">HELLO</div>');

    await server.stop();
    await fs.remove(temp);
  });
});
