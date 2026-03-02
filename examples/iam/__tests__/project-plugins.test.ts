import { describe, it, expect } from 'vitest';
import path from 'path';
import { PluginLoader } from '../../src/build/plugin-loader.js';

// Ensure that project plugins shipped inside the example directory can be
// discovered by the generic PluginLoader utility.  This keeps the example
// free of application-specific bootstrap code.

describe('IAM project plugins auto-load', () => {
  it('discovers plugins under examples/iam/plugins', async () => {
    const loader = new PluginLoader();
    const pluginDir = path.resolve(__dirname, '../plugins');
    const plugins = await loader.loadProjectPlugins(pluginDir);

    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins.length).toBeGreaterThan(0);
    expect(plugins.some(p => p && typeof p.name === 'string')).toBe(true);
  });
});