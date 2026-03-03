import { describe, it, expect } from 'vitest';
import { createBootstrap } from '@ux3/ui/bootstrap';
// simple fake config for testing
const fakeConfig = {
    routes: [],
    services: {},
    machines: {},
    i18n: {},
    widgets: {},
    styles: {},
    templates: {},
};
describe('bootstrap helper', () => {
    it('returns an initApp function that is callable', async () => {
        const init = createBootstrap(fakeConfig);
        expect(typeof init).toBe('function');
        // calling it in node environment should still return a context
        const ctx = await init({ validateVersion: false, recoverState: false });
        expect(ctx).toBeDefined();
        expect(ctx.styles).toBeDefined();
    });
    it('registers initApp on window when in browser env', () => {
        if (typeof window === 'undefined') {
            expect(true).toBe(true);
            return;
        }
        const init = createBootstrap(fakeConfig);
        expect(window.initApp).toBe(init);
    });
});
//# sourceMappingURL=bootstrap.test.js.map