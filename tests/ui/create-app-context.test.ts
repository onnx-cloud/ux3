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
