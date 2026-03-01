import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';

// minimal bundle + hydration script snippets used in tests
const bundleCode = `window.initApp = async function() { window.__ux3App = { hello: true }; return window.__ux3App; };`;
const hydrationScript = `document.addEventListener('DOMContentLoaded', () => { if (typeof window.initApp === 'function') { window.initApp().catch(e=>console.error(e)); } });`;

describe('Hydration integration', () => {
  it('should execute hydration script and populate __ux3App', async () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="app"></div>${hydrationScript}</body></html>`, { runScripts: 'dangerously', resources: 'usable' });
    // simulate bundle loading by evaluating code
    dom.window.eval(bundleCode);

    // trigger DOMContentLoaded
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    expect((dom.window as any).__ux3App).toBeDefined();
    expect((dom.window as any).__ux3App.hello).toBe(true);
  });

  it('should recover state when initialState is set', async () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="app"></div>${hydrationScript}</body></html>`, { runScripts: 'dangerously', resources: 'usable' });
    dom.window.__INITIAL_STATE__ = { foo: 'bar' };
    dom.window.eval(bundleCode + `window.initApp = async function(opts={}) { window.__ux3App = { state: opts.initialState || null }; return window.__ux3App; };`);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    expect((dom.window as any).__ux3App.state).toEqual({ foo: 'bar' });
  });
});
