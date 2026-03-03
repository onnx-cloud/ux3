import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
async function makeTemp() {
    const tmpRoot = path.join(process.cwd(), 'tmp');
    await fs.ensureDir(tmpRoot);
    const temp = path.join(tmpRoot, `ux3-devserver-${Date.now()}`);
    await fs.ensureDir(temp);
    await fs.ensureDir(path.join(temp, 'ux', 'view'));
    await fs.ensureDir(path.join(temp, 'ux', 'layout'));
    return temp;
}
describe('DevServer layout selection priority', () => {
    it('prefers ux/layout/<name>.html', async () => {
        const temp = await makeTemp();
        // create layout candidate A
        const a = `<div id="layout">A:{{site.template}}</div>`;
        await fs.writeFile(path.join(temp, 'ux', 'layout', 'default.html'), a);
        // create a source view
        await fs.ensureDir(path.join(temp, 'ux', 'view', 'home'));
        await fs.writeFile(path.join(temp, 'ux', 'view', 'home', 'index.html'), `<div id="view">VIEW</div>`);
        await fs.writeFile(path.join(temp, 'ux', 'view', 'index.yaml'), `name: index\ninitial: index\nstates:\n  index:\n    template: 'view/home/index.html'\nlayout: default\n`);
        const { DevServer } = await import('@ux3/dev/dev-server');
        const server = new DevServer(temp, 3630, 'localhost');
        await server.start();
        const res = await fetch('http://localhost:3630/');
        const html = await res.text();
        expect(html).toContain('A:');
        await server.stop();
        await fs.remove(temp);
    });
    it('falls back to ux/layout/<name>/_.html when specific not present', async () => {
        const temp = await makeTemp();
        const b = `<div id="layout">B:{{site.template}}</div>`;
        await fs.ensureDir(path.join(temp, 'ux', 'layout', 'default'));
        await fs.writeFile(path.join(temp, 'ux', 'layout', 'default', '_.html'), b);
        await fs.ensureDir(path.join(temp, 'ux', 'view', 'home'));
        await fs.writeFile(path.join(temp, 'ux', 'view', 'home', 'index.html'), `<div id="view">VIEW</div>`);
        await fs.writeFile(path.join(temp, 'ux', 'view', 'index.yaml'), `name: index\ninitial: index\nstates:\n  index:\n    template: 'view/home/index.html'\nlayout: default\n`);
        const { DevServer } = await import('@ux3/dev/dev-server');
        const server = new DevServer(temp, 3631, 'localhost');
        await server.start();
        const res = await fetch('http://localhost:3631/');
        const html = await res.text();
        expect(html).toContain('B:');
        await server.stop();
        await fs.remove(temp);
    });
    it('uses ux/layout/_.html project default if no named layouts', async () => {
        const temp = await makeTemp();
        const p = `<div id="layout">P:{{site.template}}</div>`;
        await fs.writeFile(path.join(temp, 'ux', 'layout', '_.html'), p);
        await fs.ensureDir(path.join(temp, 'ux', 'view', 'home'));
        await fs.writeFile(path.join(temp, 'ux', 'view', 'home', 'index.html'), `<div id="view">VIEW</div>`);
        await fs.writeFile(path.join(temp, 'ux', 'view', 'index.yaml'), `name: index\ninitial: index\nstates:\n  index:\n    template: 'view/home/index.html'\nlayout: default\n`);
        const { DevServer } = await import('@ux3/dev/dev-server');
        const server = new DevServer(temp, 3632, 'localhost');
        await server.start();
        const res = await fetch('http://localhost:3632/');
        const html = await res.text();
        expect(html).toContain('P:');
        await server.stop();
        await fs.remove(temp);
    });
    it('falls back to framework default when project defaults not found', async () => {
        const temp = await makeTemp();
        // No project layout files created; framework default exists in repo's src/ui/layouts/_.html
        await fs.ensureDir(path.join(temp, 'ux', 'view', 'home'));
        await fs.writeFile(path.join(temp, 'ux', 'view', 'home', 'index.html'), `<div id="view">VIEW</div>`);
        await fs.writeFile(path.join(temp, 'ux', 'view', 'index.yaml'), `name: index\ninitial: index\nstates:\n  index:\n    template: 'view/home/index.html'\nlayout: default\n`);
        const { DevServer } = await import('@ux3/dev/dev-server');
        const server = new DevServer(temp, 3633, 'localhost');
        await server.start();
        const res = await fetch('http://localhost:3633/');
        const html = await res.text();
        // framework default layout contains the marker '<title>' and '{{ site.template }}' area; assert view exists wrapped
        expect(html).toContain('<title>');
        expect(html).toContain('<div id="view">VIEW</div>');
        await server.stop();
        await fs.remove(temp);
    });
});
//# sourceMappingURL=dev-server-layout-priority.test.js.map