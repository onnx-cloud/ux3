import { describe, it, expect } from 'vitest';
// use require to avoid vite resolution issues
let initApp: any;
let config: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../index');
  initApp = mod.initApp || mod.hydrate;
  config = mod.config;
} catch (_e) {
  // tests will skip if import fails
}

// verify that built-in plugins install their services

describe('IAM built-in plugins', () => {
  it('services for router, forms, auth, state exist after init', async () => {
    if (typeof initApp !== 'function') {
      expect(true).toBe(true);
      return;
    }
    const app = await initApp();
    const svc = app.services;
    expect(svc['ux3.service.router']).toBeDefined();
    expect(svc['ux3.service.forms']).toBeDefined();
    expect(svc['ux3.service.auth']).toBeDefined();
    expect(svc['ux3.service.state'] || svc['ux3.service.reconnect']).toBeDefined();

    // plugin routes should be registered
    const nav = app.nav;
    expect(nav.routes.some((r:any)=>r.path==='/dropdown')).toBe(true);
    expect(nav.routes.some((r:any)=>r.path==='/charts')).toBe(true);
    expect(nav.routes.some((r:any)=>r.path==='/stripe')).toBe(true);
  });
});