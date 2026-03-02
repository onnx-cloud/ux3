import { test as base, expect, Page } from '@playwright/test';

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    // inject helper before any script runs
    await page.addInitScript(() => {
      (window as any).__test = {
        emit: (name: string, payload?: any) => {
          // simple dispatch to global. apps can optionally listen.
          const ev = new CustomEvent('ux3-test', { detail: { name, payload } });
          window.dispatchEvent(ev as unknown as Event);
        },
        getState: (machine?: string) => {
          const ctx = (window as any).__ux3Inspector;
          if (!ctx) return null;
          if (machine) {
            const f = ctx.machines?.[machine];
            return f?.getState();
          }
          // return first machine state
          const keys = Object.keys(ctx.machines || {});
          if (keys.length === 0) return null;
          return ctx.machines[keys[0]].getState();
        }
      };
    });
    await use(page);
  }
});

export { expect };
