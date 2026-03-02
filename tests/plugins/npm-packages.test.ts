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
