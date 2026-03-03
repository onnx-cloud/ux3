import { describe, it, expect } from 'vitest';
import { PluginLoader } from '@ux3/plugin/loader';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const loader = new PluginLoader();

describe('PluginLoader', () => {
  it('loadFromPath imports a plugin module', async () => {
    // create temporary file
    const tempDir = await fs.mkdtemp(join(tmpdir(), 'ux3-plugin-'));
    const file = join(tempDir, 'test-plugin.ts');
    const code = `exports.default = { name: 'temp', version: '0.0.1' };`;
    await fs.writeFile(file, code);

    const plugin = await loader.loadFromPath(file);
    expect(plugin.name).toBe('temp');
    expect(plugin.version).toBe('0.0.1');
  });

  it('loadProjectPlugins returns plugins from directory', async () => {
    const tempDir = await fs.mkdtemp(join(tmpdir(), 'ux3-plugins-'));
    const file1 = join(tempDir, 'a.ts');
    const file2 = join(tempDir, 'sub', 'b.ts');
    await fs.mkdir(join(tempDir, 'sub'));
    await fs.writeFile(file1, `exports.default={name:'a',version:'1'};`);
    await fs.writeFile(file2, `exports.default={name:'b',version:'2'};`);

    const plugins = await loader.loadProjectPlugins(tempDir);
    const names = plugins.map((p) => p.name).sort();
    expect(names).toEqual(['a', 'b']);
  });
});
