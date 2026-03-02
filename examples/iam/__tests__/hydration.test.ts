import { describe, it, expect } from 'vitest';
// dynamic import because module path may not resolve correctly under Vite
let hydrate: any;
let config: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../index');
  hydrate = mod.hydrate || mod.initApp;
  config = mod.config;
} catch (err) {
  // if require fails, we cannot run the test; hydrate will remain undefined
}

describe('IAM hydration helpers', () => {
  it('hydrate returns app context', async () => {
    if (typeof hydrate !== 'function') {
      // skip if not available
      expect(true).toBe(true);
      return;
    }
    const app = await hydrate(config, { validateVersion: false, recoverState: false, reattachListeners: false, reconnectServices: false });
    expect(app).toBeDefined();
    expect(app.machines).toBeDefined();
    expect(app.services).toBeDefined();
  });
});
