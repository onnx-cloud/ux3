// @vitest-environment node
import fs from 'fs-extra';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PluginLoader } from '../../src/build/plugin-loader.ts';
const tmpRoot = path.join(process.cwd(), 'tests', 'tmp', 'plugin-loader');
describe('PluginLoader', () => {
    beforeEach(async () => {
        await fs.remove(tmpRoot);
        await fs.ensureDir(tmpRoot);
    });
    afterEach(async () => {
        await fs.remove(tmpRoot);
    });
    it('loadFromPath can import a simple plugin module', async () => {
        const pluginPath = path.join(tmpRoot, 'myplugin.ts');
        const code = `export default { name: 'foo', version: '1.0.0' };`;
        await fs.writeFile(pluginPath, code);
        const loader = new PluginLoader();
        const p = await loader.loadFromPath(pluginPath);
        expect(p.name).toBe('foo');
        expect(p.version).toBe('1.0.0');
    });
    it('loadProjectPlugins walks directory and returns plugins', async () => {
        const dir = path.join(tmpRoot, 'dir');
        await fs.ensureDir(dir);
        const plugin1 = path.join(dir, 'a.ts');
        await fs.writeFile(plugin1, `export default { name: 'a', version: '0.1' };`);
        const sub = path.join(dir, 'sub');
        await fs.ensureDir(sub);
        const plugin2 = path.join(sub, 'b.ts');
        await fs.writeFile(plugin2, `export default { name: 'b', version: '0.2' };`);
        const loader = new PluginLoader();
        const list = await loader.loadProjectPlugins(dir);
        const names = list.map((p) => p.name).sort();
        expect(names).toEqual(['a', 'b']);
    });
});
//# sourceMappingURL=plugin-loader.test.js.map