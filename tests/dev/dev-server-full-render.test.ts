import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('DevServer full page rendering (layout + chrome + view tree)', () => {
  it('renders header, main chrome and the view widget tree from index.yaml', async () => {
    const temp = path.join(os.tmpdir(), `ux3-devserver-${Date.now()}`);
    await fs.ensureDir(temp);
    await fs.ensureDir(path.join(temp, 'ux', 'view'));
    await fs.ensureDir(path.join(temp, 'ux', 'layout'));

    // layout with header + main placeholder
    const layoutHtml = `
<header id="site-header">
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>
</header>

<main id="ux-content" role="main">
  {{{content}}}
</main>

<footer id="site-footer">© ACME</footer>
`;
    await fs.writeFile(path.join(temp, 'ux', 'layout', 'default.html'), layoutHtml);

    // view that represents widget tree (uses ux-state attr to ensure widget markers are present)
    const viewHtml = `<div ux-state="home.loaded">
  <div ux-style="widget">HELLO WIDGET</div>
  <div ux-style="actions"><button ux-event="RETRY">Retry</button></div>
</div>`;
    await fs.ensureDir(path.join(temp, 'ux', 'view', 'home'));
    await fs.writeFile(path.join(temp, 'ux', 'view', 'home', 'index.html'), viewHtml);

    // index.yaml referencing the view and declaring the layout
    await fs.writeFile(path.join(temp, 'ux', 'view', 'index.yaml'), `name: index\ninitial: index\nstates:\n  index:\n    template: 'view/home/index.html'\nlayout: default\n`);

    const { DevServer } = await import('@ux3/dev/dev-server.js');
    const port = 3690;
    const server = new DevServer(temp, port, 'localhost');
    await server.start();

    const res = await fetch(`http://localhost:${port}/`);
    const html = await res.text();

    // Debug: print full html when test fails to help diagnose rendering issues
    console.error('DEV-SERVER-FULL-RENDER-HTML:\n' + html);

    // Quick local simulation of the layout insertion logic to reproduce potential parsing issues
    const viewTemplate = await fs.readFile(path.join(temp, 'ux', 'view', 'home', 'index.html'), 'utf-8');
    const layoutHtmlRaw = await fs.readFile(path.join(temp, 'ux', 'layout', 'default.html'), 'utf-8');
    const normalized = layoutHtmlRaw.replace(/\{\{\{\s*content\s*\}\}\}/g, '{{ site.template }}').replace(/\{\{\s*>\s*layout\s*\}\}/g, '{{ site.template }}');
    function localRender(tpl: string, ctx: any = {}) {
      return tpl.replace(/\{\{\s*([^\}]+?)\s*\}\}/g, (_: any, key: any) => {
        const val = key.split('.').reduce((acc: any, part: any) => (acc && acc[part] !== undefined ? acc[part] : undefined), ctx);
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      });
    }
    console.error('DEV-SERVER-FULL-RENDER-DEBUG: normalized layout ->', normalized);
    console.error('DEV-SERVER-FULL-RENDER-DEBUG: local render ->', localRender(normalized, { site: { template: viewTemplate, title: 'ACME' } }));

    // Assertions: chrome (header, footer, main) and view tree (ux-state, widget content)
    expect(html).toContain('<header id="site-header">');
    expect(html).toContain('<main id="ux-content"');
    expect(html).toContain('<div ux-state="home.loaded">');
    expect(html).toContain('HELLO WIDGET');

    await server.stop();
    await fs.remove(temp);
  });
});
