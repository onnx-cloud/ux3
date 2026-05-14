import { describe, it, expect } from 'vitest';
import { createAppContext } from '../../src/ui/context-builder.ts';
import { defaultLogger } from '../../src/security/observability.ts';

function waitFor<T>(fn: () => T | null, timeout = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const result = fn();
      if (result) return resolve(result);
      if (Date.now() - start > timeout) return reject(new Error('waitFor timeout'));
      setTimeout(check, 10);
    };
    check();
  });
}

// simple generated config stub
const baseConfig = {
  routes: [],
  services: {},
  machines: {},
  i18n: {},
  widgets: {},
  styles: {},
  templates: {},
};

describe('createAppContext development logging', () => {
  it('should lower logger threshold when config.development.logging is debug', async () => {
    const cfg = { ...baseConfig, development: { logging: 'debug' } };
    await createAppContext(cfg as any);
    expect(defaultLogger['config'].minLevel).toBe('debug');
  });

  it('should attach telemetry function when debug logging', async () => {
    const cfg = { ...baseConfig, development: { logging: 'debug' } };
    await createAppContext(cfg as any);
    expect(typeof (window as any).__ux3Telemetry).toBe('function');
  });

  it('does not expose legacy inspector on window when enabled', async () => {
    const cfg = { ...baseConfig, development: { inspector: true } };
    await createAppContext(cfg as any);
    expect((window as any).__ux3Inspector).toBeUndefined();
  });

  it('should expose browser context on app context', async () => {
    const cfg = { ...baseConfig };
    const ctx = await createAppContext(cfg as any);
    expect(ctx.browser).toBeTruthy();
    expect(ctx.browser.locale.primary).toBeTruthy();
    expect((ctx.ui as any).browser).toBeTruthy();
  });

  it('does not mount the legacy <ux3-inspector> widget to the body', async () => {
    const cfg = { ...baseConfig, development: { inspector: true } };
    await createAppContext(cfg as any);
    expect(document.body.querySelector('ux3-inspector')).toBeNull();
  });

  it('mounts the inspector compatibility UI when plugin config enables dev tools', async () => {
    const cfg: any = {
      ...baseConfig,
      plugins: [{ name: '@ux3/plugin-dev-tools', config: { enabled: true } }],
    };
    await createAppContext(cfg);
    // Inspector mounts asynchronously via dynamic import; poll briefly.
    const el = await waitFor(() => document.getElementById('ux3-devtools-inspector'));
    expect(el).toBeTruthy();
  });

  it('starts inspector with tab bar and minimized style', async () => {
    const existing = document.getElementById('ux3-devtools-inspector');
    existing?.remove();

    const cfg: any = {
      ...baseConfig,
      development: { inspector: true },
    };
    await createAppContext(cfg);

    const inspector = await waitFor(() => document.getElementById('ux3-devtools-inspector') as HTMLElement | null);
    expect(inspector).toBeTruthy();
    // Tab bar exists
    expect(inspector?.querySelector('.ux3-inspector-tabbar')).toBeTruthy();
    // Panel host hidden when minimized
    const host = inspector?.querySelector('.ux3-inspector-panel-host') as HTMLElement | null;
    expect(host?.style.display).toBe('none');
    // Opacity at minimized level (0.5 or '')
    expect(parseFloat(inspector?.style.opacity || '')).toBeCloseTo(0.5, 1);
  });

  it('auto-installs dev tools plugin in development mode', async () => {
    const cfg = { ...baseConfig, development: { devTools: true } };
    const ctx: any = await createAppContext(cfg as any);
    expect(ctx.services.devTools).toBeTruthy();
    expect(ctx.utils.devTools).toBeTruthy();
    expect(typeof ctx.utils.devTools.getSnapshot).toBe('function');
  });

  it('tracks installed plugins through the dev tools service', async () => {
    const cfg: any = {
      ...baseConfig,
      development: { inspector: true },
    };
    const ctx = await createAppContext(cfg);
    const snapshot = (ctx as any).utils.devTools.getSnapshot();
    expect(snapshot.plugins.some((plugin: any) => plugin.name === '@ux3/plugin-dev-tools')).toBe(true);
  });
});

// helpers and plugin registration behaviour

describe('AppContext helper methods', () => {
  it('provides registerAsset and updates config.site.assets', async () => {
    const cfg: any = { ...baseConfig, site: {} };
    const ctx: any = await createAppContext(cfg);
    expect(typeof ctx.registerAsset).toBe('function');
    ctx.registerAsset({ type: 'script', src: '/foo.ts' });
    expect(cfg.site.assets).toEqual([{ type: 'script', src: '/foo.ts' }]);
  });

  it('registerService adds service to context', async () => {
    const cfg: any = { ...baseConfig };
    const ctx: any = await createAppContext(cfg);
    ctx.registerService('foo', () => ({ hello: 'world' }));
    expect(ctx.services.foo.hello).toBe('world');
  });

  it('registerView makes template available via context.template', async () => {
    const cfg: any = { ...baseConfig, templates: {} };
    const ctx: any = await createAppContext(cfg);
    ctx.registerView('test-view', '<div>hi</div>');
    expect(ctx.template('test-view')).toBe('<div>hi</div>');
  });

  it('registerMachine and registerRoute interact with router', async () => {
    const cfg: any = { ...baseConfig, routes: [] };
    const ctx: any = await createAppContext(cfg);
    // use simple FSM from registry
    const fsm = new (await import('../../src/fsm/state-machine.ts')).StateMachine({
      id: 'foo',
      initial: 'a',
      states: { a: {} },
    });
    ctx.registerMachine('foo', fsm);
    expect(ctx.machines.foo).toBe(fsm);
    ctx.registerRoute('/foo', 'foo');
    expect(ctx.nav.routes.find((r:any)=>r.path==='/foo')).toBeTruthy();
  });

  it('registerPlugin invokes install method on provided plugin', async () => {
    const cfg: any = { ...baseConfig };
    const ctx: any = await createAppContext(cfg);
    let called = false;
    const plg = { install(app: any) { called = !!app; } } as any;
    ctx.registerPlugin!(plg);
    expect(called).toBe(true);
  });

  it('loads and installs plugin-chart-js', async () => {
    const cfg: any = { ...baseConfig, site: {} };
    const ctx: any = await createAppContext(cfg);
    const pluginModule = await import('@ux3/ux-charts');
    const plugin = pluginModule?.default || pluginModule;
    if (ctx.registerPlugin && plugin) {
      await ctx.registerPlugin(plugin);
    }
    expect(customElements.get('ux-chart-line')).toBeTruthy();
  });

  it('auto-installs content plugin when config.content exists', async () => {
    const simpleItem = { slug: 'foo', frontmatter: { title: 'Foo' }, html: '<p>foo</p>' };
    const cfg: any = { ...baseConfig, content: { items: [simpleItem] } };
    const ctx: any = await createAppContext(cfg);
    // content plugin should register a route for /foo
    expect(ctx.nav.routes.some((r:any)=>r.path==='/foo')).toBe(true);
    // service should be available and return expected data
    const result = await ctx.services.content.load({ entry: 'foo' });
    expect(result.html).toBe('<p>foo</p>');
  });
});
