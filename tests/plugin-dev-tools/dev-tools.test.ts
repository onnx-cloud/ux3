import { beforeEach, describe, expect, it } from 'vitest';
import { DevToolsPlugin } from '../../packages/@ux3/plugin-dev-tools/src/index';

describe('@ux3/plugin-dev-tools', () => {
  let app: any;

  beforeEach(() => {
    app = {
      config: { development: { inspector: false }, plugins: {} },
      registerService(name: string, factory: () => unknown) {
        this.services = this.services || {};
        this.services[name] = factory();
      },
      services: {},
      utils: {},
    };
    delete (DevToolsPlugin as any).config;
    delete (window as any).__ux3DevTools;
  });

  it('has expected metadata', () => {
    expect(DevToolsPlugin.name).toBe('@ux3/plugin-dev-tools');
    expect(DevToolsPlugin.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('installs devTools service and utils API', async () => {
    await DevToolsPlugin.install?.(app);
    expect(app.services.devTools).toBeTruthy();
    expect(app.utils.devTools).toBeTruthy();
    expect(typeof app.utils.devTools.open).toBe('function');
    expect(typeof app.utils.devTools.emit).toBe('function');
    expect((window as any).__ux3DevTools).toBe(app.utils.devTools);
    expect((window as any).__ux3Inspector).toBeUndefined();
  });

  it('exposes the browser bridge for transitional inspector adapters', async () => {
    await DevToolsPlugin.install?.(app);
    expect((window as any).__ux3DevTools).toBeTruthy();
  });

  it('records plugin snapshots', async () => {
    await DevToolsPlugin.install?.(app);
    app.utils.devTools.recordPlugin({ name: '@ux3/plugin-dev-tools', version: '0.1.0', hooks: ['ready'], status: 'active' });
    expect(app.utils.devTools.getSnapshot().plugins).toEqual([
      { name: '@ux3/plugin-dev-tools', version: '0.1.0', hooks: ['ready'], status: 'active' },
    ]);
  });
});
