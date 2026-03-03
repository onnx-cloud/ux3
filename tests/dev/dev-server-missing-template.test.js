import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
describe('DevServer missing template behavior', () => {
    it('should instruct to run compile when template missing (no fs fallback)', async () => {
        const temp = path.join(os.tmpdir(), `ux3-devserver-${Date.now()}`);
        await fs.ensureDir(temp);
        await fs.ensureDir(path.join(temp, 'ux', 'view'));
        // create index.yaml referencing non-existent template
        await fs.writeFile(path.join(temp, 'ux', 'view', 'index.yaml'), `name: index\ninitial: index\nstates:\n  index:\n    template: 'view/home/index.html'\n`);
        const { DevServer } = await import('@ux3/dev/dev-server.js');
        const server = new DevServer(temp, 3600, 'localhost');
        await server.start();
        const res = await fetch('http://localhost:3600/');
        const html = await res.text();
        expect(html).toContain('Missing view template');
        expect(html).toContain('npx ux3 compile');
        await server.stop();
        await fs.remove(temp);
    });
});
//# sourceMappingURL=dev-server-missing-template.test.js.map