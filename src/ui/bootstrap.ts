/**
 * Application bootstrap helper
 *
 * Projects no longer need to ship their own `app.ts`/`index.ts`.  This
 * module exposes a simple factory that wires up hydration, style registry and
 * debug helpers using the generated configuration.  The CLI scaffolder and
 * runtime bundle both rely on this helper by default.
 */

import type { GeneratedConfig, HydrationOptions } from './context-builder.js';
import { hydrate as coreHydrate } from './context-builder.js';

/**
 * Create a project-specific bootstrap function and optionally expose it globally.
 *
 * Usage from an application entrypoint (eg. `src/index.ts`):
 *
 * ```ts
 * import { createBootstrap } from '@ux3/ui/bootstrap';
 * import { config } from './generated/config.js';
 *
 * export const initApp = createBootstrap(config);
 * ```
 *
 * The returned `initApp` function automatically registers itself on
 * `window.initApp` and will run on DOMContentLoaded when executed in a browser.
 */
export function createBootstrap(
  config: GeneratedConfig
): (opts?: HydrationOptions) => Promise<any> {
  async function initApp(opts: HydrationOptions = {}) {
    return coreHydrate(config, {
      recoverState: true,
      reattachListeners: true,
      reconnectServices: true,
      validateVersion: true,
      ...opts,
    });
  }

  if (typeof window !== 'undefined') {
    (window as any).initApp = initApp;

    if (document.readyState === 'loading') {
      // the listener doesn't receive our hydration options; wrap so the
      // signature matches the DOM API and drop any event argument.
      document.addEventListener('DOMContentLoaded', () => {
        initApp().catch((e) => console.error('[UX3]', e));
      });
    } else {
      // if DOM already loaded (e.g. script tag placed at end) run immediately
      initApp().catch((e) => console.error('[UX3]', e));
    }
  }

  return initApp;
}

// convenience default export that will be used once a config is available; the
// framework build can generate a small wrapper that imports this module along
// with the project's generated config and calls `createBootstrap(config)`.

export default createBootstrap;
