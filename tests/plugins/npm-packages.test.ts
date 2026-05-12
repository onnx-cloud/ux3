import { describe, it, expect } from 'vitest';

describe('npm plugin packages', () => {
  const packages = ['plugin-i18n', 'plugin-analytics', 'plugin-validation', 'ux-chart-js', 'ux-tailwind', 'plugin-oidc'];

  packages.forEach((pkg) => {
    it(`can import ${pkg}`, async () => {
      const mod = await import(`@ux3/${pkg}`);
      const plugin = mod.default || mod;
      expect(plugin.name).toContain(pkg);
      expect(plugin.version).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});
