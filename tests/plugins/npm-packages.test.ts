import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// test that the local npm-style package folders export plugins directly

describe('npm plugin packages', () => {
  const base = join(process.cwd(), 'packages/@ux3');

  ['plugin-i18n', 'plugin-telemetry', 'plugin-analytics', 'plugin-validation', 'plugin-chart-js', 'plugin-tailwind-plus', 'plugin-oidc'].forEach((pkg) => {
    it(`can require ${pkg}`, () => {
      const pluginPath = join(base, pkg, 'src', 'index.ts');
      const mod = require(pluginPath);
      const plugin = mod.default || mod;
      expect(plugin.name).toContain(pkg);
      expect(plugin.version).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});
