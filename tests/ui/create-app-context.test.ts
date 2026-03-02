import { describe, it, expect } from 'vitest';
import { createAppContext } from '../../src/ui/context-builder.js';
import { defaultLogger } from '../../src/security/observability.js';

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

  it('should expose inspector on window when enabled', async () => {
    const cfg = { ...baseConfig, development: { inspector: true } };
    const ctx = await createAppContext(cfg as any);
    expect((window as any).__ux3Inspector).toBe(ctx);
  });

  it('should mount a <ux3-inspector> widget to the body', async () => {
    const cfg = { ...baseConfig, development: { inspector: true } };
    await createAppContext(cfg as any);
    const el = document.body.querySelector('ux3-inspector');
    expect(el).toBeInstanceOf(HTMLElement);
    // header and close button exist
    const header = el!.shadowRoot?.querySelector('div');
    expect(header).toBeTruthy();
    const btn = el!.shadowRoot?.querySelector('button');
    expect(btn).toBeInstanceOf(HTMLElement);
    // clicking close removes element
    btn?.dispatchEvent(new MouseEvent('click'));
    expect(document.body.querySelector('ux3-inspector')).toBeNull();
  });

  it('inspector widget should update when machine state changes', async () => {
    // create a config with a simple machine
    const cfg: any = {
      ...baseConfig,
      machines: {
        test: { id: 'test', initial: 'a', states: { a: { on: { NEXT: 'b' } }, b: {} } },
      },
      development: { inspector: true },
    };
    const ctx = await createAppContext(cfg);
    const widget = document.body.querySelector('ux3-inspector') as HTMLElement;
    expect(widget).toBeTruthy();
    // initial snapshot should include state 'a'
    const pre = widget.shadowRoot?.querySelector('pre');
    expect(pre?.textContent).toContain('"test": "a"');
    // send an event and wait
    ctx.machines['test'].send('NEXT');
    await new Promise((r) => setTimeout(r, 0));
    expect(pre?.textContent).toContain('"test": "b"');
  });
});

// helpers and plugin registration behaviour

describe('AppContext helper methods', () => {
  it('provides registerAsset and updates config.site.assets', async () => {
    const cfg: any = { ...baseConfig, site: {} };
    const ctx: any = await createAppContext(cfg);
    expect(typeof ctx.registerAsset).toBe('function');
    ctx.registerAsset({ type: 'script', src: '/foo.js' });
    expect(cfg.site.assets).toEqual([{ type: 'script', src: '/foo.js' }]);
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
    const fsm = new (await import('../../src/fsm/state-machine.js')).StateMachine({
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
});
