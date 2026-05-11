import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';

describe('DevServer missing template behavior', () => {
  it('serves page without view content when template file is missing (no error)', async () => {
    const tmpRoot = path.join(process.cwd(), 'tmp');
    await fs.ensureDir(tmpRoot);
    const temp = path.join(tmpRoot, `ux3-devserver-${Date.now()}`);
    await fs.ensureDir(temp);
    await fs.ensureDir(path.join(temp, 'ux', 'widget'));

    await fs.writeFile(path.join(temp, 'ux', 'widget', 'index.yaml'), `name: index\ninitial: index\nstates:\n  index:\n    template: 'widget/home/index.html'\n`);

    const { DevServer } = await import('@ux3/dev/dev-server.ts');
    const server = new DevServer(temp, 3600, 'localhost');
    await server.start();

    const res = await fetch('http://localhost:3600/');
    const html = await res.text();

    // Should serve a valid page, just without the missing template content
    expect(html).not.toContain('Missing view template');
    expect(html).not.toContain('npx ux3 compile');

    await server.stop();
    await fs.remove(temp);
  });
});
