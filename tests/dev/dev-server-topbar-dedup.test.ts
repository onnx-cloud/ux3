import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';

async function makeTemp() {
  const tmpRoot = path.join(process.cwd(), 'tmp');
  await fs.ensureDir(tmpRoot);
  const temp = path.join(tmpRoot, `ux3-topbar-dedup-${Date.now()}`);
  await fs.ensureDir(temp);
  await fs.ensureDir(path.join(temp, 'ux', 'view'));
  await fs.ensureDir(path.join(temp, 'ux', 'layout'));
  await fs.ensureDir(path.join(temp, 'ux', 'i18n', 'en'));
  return temp;
}

describe('Topbar deduplication', () => {
  it('server HTML contains exactly one topbar when view layout has chrome', async () => {
    const temp = await makeTemp();

    const layoutHtml = `
<div ux-style="kitchen-app">
  <ux-app-shell>
    <ux-topbar ux-style="section">
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
    </ux-topbar>
    <main id="ux-content" role="main">
      {{{content}}}
    </main>
  </ux-app-shell>
</div>`;
    await fs.writeFile(path.join(temp, 'ux', 'layout', 'default.html'), layoutHtml);

    const viewHtml = `<div ux-style="section">
  <h1>Hello World</h1>
  <p>This is a test view.</p>
</div>`;
    await fs.ensureDir(path.join(temp, 'ux', 'widget', 'home'));
    await fs.writeFile(path.join(temp, 'ux', 'widget', 'home', 'index.html'), viewHtml);

    await fs.writeFile(path.join(temp, 'ux', 'widget', 'index.yaml'),
      `name: index\ninitial: index\nstates:\n  index:\n    template: 'widget/home/index.html'\nlayout: default\n`);

    await fs.writeFile(path.join(temp, 'ux', 'i18n', 'en', 'site.yaml'),
      `title: Test App\ndescription: A test app`);

    const { DevServer } = await import('@ux3/dev/dev-server');
    const port = 3770;
    const server = new DevServer(temp, port, 'localhost');
    await server.start();

    const res = await fetch(`http://localhost:${port}/`);
    const html = await res.text();

    expect(html).toContain('<html>');
    expect(html).toContain('<title>');
    expect(html).toContain('<ux-topbar');
    expect(html).toContain('<main id="ux-content"');
    expect(html).toContain('Hello World');

    const topbarMatches = html.match(/<ux-topbar/g);
    expect(topbarMatches?.length ?? 0).toBe(1);

    await server.stop();
    await fs.remove(temp);
  });

  it('server HTML uses framework _.html wrapper when project has no _.html', async () => {
    const temp = await makeTemp();

    const layoutHtml = `<main id="ux-content" role="main">{{{content}}}</main>`;
    await fs.writeFile(path.join(temp, 'ux', 'layout', 'default.html'), layoutHtml);

    const viewHtml = `<div>Minimal View</div>`;
    await fs.ensureDir(path.join(temp, 'ux', 'widget', 'home'));
    await fs.writeFile(path.join(temp, 'ux', 'widget', 'home', 'index.html'), viewHtml);

    await fs.writeFile(path.join(temp, 'ux', 'widget', 'index.yaml'),
      `name: index\ninitial: index\nstates:\n  index:\n    template: 'widget/home/index.html'\nlayout: default\n`);

    await fs.writeFile(path.join(temp, 'ux', 'i18n', 'en', 'site.yaml'),
      `title: Minimal\ndescription: A minimal app`);

    const { DevServer } = await import('@ux3/dev/dev-server');
    const port = 3771;
    const server = new DevServer(temp, port, 'localhost');
    await server.start();

    const res = await fetch(`http://localhost:${port}/`);
    const html = await res.text();

    expect(html).toContain('<html>');
    expect(html).toContain('<title>Minimal</title>');
    expect(html).toContain('<main id="ux-content"');
    expect(html).toContain('Minimal View');

    await server.stop();
    await fs.remove(temp);
  });

  it('server HTML contains no duplicate topbar when view layout has full chrome and no project _.html', async () => {
    const temp = await makeTemp();

    const layoutHtml = `
<div ux-style="kitchen-app">
  <ux-app-shell>
    <ux-topbar ux-style="header">
      <a href="/">Home</a>
      <a href="/about">About</a>
      <ux-theme-toggle></ux-theme-toggle>
    </ux-topbar>
    <main id="ux-content" role="main">
      {{{content}}}
    </main>
  </ux-app-shell>
</div>`;
    await fs.writeFile(path.join(temp, 'ux', 'layout', 'default.html'), layoutHtml);

    const viewHtml = `<div ux-style="section">
  <h2>Feature Section</h2>
  <ux-button variant="primary">Click me</ux-button>
</div>`;
    await fs.ensureDir(path.join(temp, 'ux', 'widget', 'home'));
    await fs.writeFile(path.join(temp, 'ux', 'widget', 'home', 'index.html'), viewHtml);

    await fs.writeFile(path.join(temp, 'ux', 'widget', 'index.yaml'),
      `name: index\ninitial: index\nstates:\n  index:\n    template: 'widget/home/index.html'\nlayout: default\n`);

    await fs.writeFile(path.join(temp, 'ux', 'i18n', 'en', 'site.yaml'),
      `title: Feature App\ndescription: Feature app`);

    const { DevServer } = await import('@ux3/dev/dev-server');
    const port = 3772;
    const server = new DevServer(temp, port, 'localhost');
    await server.start();

    const res = await fetch(`http://localhost:${port}/`);
    const html = await res.text();

    expect(html).toContain('<html>');
    expect(html).toContain('<title>Feature App</title>');
    expect(html).toContain('Feature Section');
    expect(html).toContain('Click me');
    expect(html).toContain('<ux-theme-toggle>');

    const topbarMatches = html.match(/<ux-topbar/g);
    expect(topbarMatches?.length ?? 0).toBe(1);

    const contentMatches = html.match(/<main id="ux-content"/g);
    expect(contentMatches?.length ?? 0).toBe(1);

    await server.stop();
    await fs.remove(temp);
  });
});
