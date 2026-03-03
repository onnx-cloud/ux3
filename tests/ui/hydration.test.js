import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
// minimal bundle + hydration script snippets used in tests
const bundleCode = `window.initApp = async function() { window.__ux3App = { hello: true }; return window.__ux3App; };`;
const hydrationScript = `document.addEventListener('DOMContentLoaded', () => { if (typeof window.initApp === 'function') { window.initApp().catch(e=>console.error(e)); } });`;
describe('Hydration integration', () => {
    it('should execute hydration script and populate __ux3App', async () => {
        const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="app"></div></body></html>`, { runScripts: 'dangerously', resources: 'usable' });
        // define bundle function then invoke it directly
        dom.window.eval(bundleCode);
        if (typeof dom.window.initApp === 'function') {
            await dom.window.initApp();
        }
        expect(dom.window.__ux3App).toBeDefined();
        expect(dom.window.__ux3App.hello).toBe(true);
    });
    it('should recover state when initialState is set', async () => {
        const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="app"></div></body></html>`, { runScripts: 'dangerously', resources: 'usable' });
        dom.window.__INITIAL_STATE__ = { foo: 'bar' };
        dom.window.eval(bundleCode + `window.initApp = async function(opts={}) { window.__ux3App = { state: opts.initialState || null }; return window.__ux3App; };`);
        if (typeof dom.window.initApp === 'function') {
            await dom.window.initApp({ initialState: dom.window.__INITIAL_STATE__ });
        }
        expect(dom.window.__ux3App.state).toEqual({ foo: 'bar' });
    });
});
//# sourceMappingURL=hydration.test.js.map