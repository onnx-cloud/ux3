import { test as base, expect } from '@playwright/test';
export const test = base.extend({
    page: async ({ page }, use) => {
        // inject helper before any script runs
        await page.addInitScript(() => {
            window.__test = {
                emit: (name, payload) => {
                    // simple dispatch to global. apps can optionally listen.
                    const ev = new CustomEvent('ux3-test', { detail: { name, payload } });
                    window.dispatchEvent(ev);
                },
                getState: (machine) => {
                    const ctx = window.__ux3Inspector;
                    if (!ctx)
                        return null;
                    if (machine) {
                        const f = ctx.machines?.[machine];
                        return f?.getState();
                    }
                    // return first machine state
                    const keys = Object.keys(ctx.machines || {});
                    if (keys.length === 0)
                        return null;
                    return ctx.machines[keys[0]].getState();
                }
            };
        });
        await use(page);
    }
});
export { expect };
//# sourceMappingURL=decl-fixtures.js.map