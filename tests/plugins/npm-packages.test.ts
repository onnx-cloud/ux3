import { describe, it, expect } from 'vitest';
import { join } from 'path';

// test that the local npm-style package folders export plugins directly

describe('npm plugin packages', () => {
  const base = join(process.cwd(), 'packages/@ux3');

  ['plugin-i18n', 'plugin-sentry', 'plugin-analytics', 'plugin-validation', 'plugin-charts-js', 'plugin-stripe', 'plugin-tailwind-plus'].forEach((pkg) => {
    it(`can require ${pkg}`, () => {
      const pluginPath = join(base, pkg, 'src', 'index.ts');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(pluginPath);
      const plugin = mod.default || mod;
      expect(plugin.name).toContain(pkg);
      expect(plugin.version).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});

describe('tailwind-plus plugin install', () => {
  it('registers dropdown FSM, view and route when installed', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../packages/@ux3/plugin-tailwind-plus/src/index.ts');
    const plugin = mod.default || mod;
    expect(plugin.name).toBe('@ux3/plugin-tailwind-plus');

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

    await ctx.registerPlugin(plugin);

    expect(ctx.machines.dropdown).toBeTruthy();
    expect(ctx.nav.routes.find((r:any)=>r.path==='/dropdown')).toBeTruthy();
    expect(ctx.template('dropdown-demo')).toContain('ux-state="dropdown"');
  });
});