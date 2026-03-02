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

  it('tailwind-plus plugin can modify context when installed', async () => {
    const loader = new PluginLoader();
    const pluginDir = path.resolve(__dirname, '../plugins');
    const plugins = await loader.loadProjectPlugins(pluginDir);
    const tp = plugins.find(p => p.name === '@ux3/plugin-tailwind-plus');
    if (!tp) {
      // nothing to assert if the example doesn't include the package
      return;
    }
    const cfg: any = {
      routes: [],
      services: {},
      machines: {},
      i18n: {},
      widgets: {},
      styles: {},
      templates: {},
    };
    const { createAppContext } = await import('../../src/ui/context-builder.js');
    const ctx: any = await createAppContext(cfg);
    ctx.registerPlugin(tp);
    expect(ctx.nav.routes.find((r:any)=>r.path==='/dropdown')).toBeTruthy();
  });
});