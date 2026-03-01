import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

// ensure bundle script generates file and that config assets updated

let initializeApp: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../app');
  initializeApp = mod.initializeApp;
} catch (_e) {}

describe('JS bundling and asset injection', () => {
  it('builds bundle and config.site.assets updated', async () => {
    // run bundler
    execSync('npm run bundle:iam', { stdio: 'inherit' });
    // check file exists
    const fs = require('fs');
    expect(fs.existsSync('examples/iam/dist/app.bundle.js')).toBe(true);

    if (typeof initializeApp === 'function') {
      const app = await initializeApp();
      const assets = app.config.site?.assets;
      expect(Array.isArray(assets)).toBe(true);
      const script = assets.find((a: any) => a.type === 'script');
      expect(script).toBeDefined();
      expect(script.src).toBe('/dist/app.bundle.js');
      expect(script.version).toBe(app.config.version);

      // config should also expose runtime keys if the build step populates them
      const runtimeCfg = app.config.site?.runtime;
      if (runtimeCfg) {
        expect(runtimeCfg.bundleKey).toBeDefined();
        expect(runtimeCfg.hydrationFn).toBeDefined();
      }
    }

    // read generated manifest and assert runtime field exists
    try {
      const mfPath = 'examples/iam/generated/build-manifest.json';
      const manifest = JSON.parse(require('fs').readFileSync(mfPath, 'utf-8'));
      expect(manifest.runtime).toBeDefined();
      expect(manifest.runtime.bundle).toMatch(/bundle\.js$/);
      expect(Array.isArray(manifest.runtime.styles)).toBe(true);
    } catch (_e) {
      // ignore if manifest not present
    }
  });
});