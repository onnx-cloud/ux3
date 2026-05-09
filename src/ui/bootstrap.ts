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
 * Create a project-specific bootstrap function.
 *
 * @param config          Generated project configuration.
 * @param installPlugins  Optional hook to install browser-side plugins after
 *                        context creation. Called BEFORE FSMs start, so services
 *                        are available when invokers fire.  Passed through to
 *                        every call — both the auto-run and explicit calls.
 *
 * Usage from an application entrypoint:
 *
 * ```ts
 * import { createBootstrap } from '@ux3/ui/bootstrap';
 * import { config } from './generated/config.js';
 * import { installPlugins } from './generated/plugins.js';
 *
 * export const initApp = createBootstrap(config, installPlugins);
 * ```
 *
 * The returned `initApp` function automatically registers itself on
 * `window.initApp` and will run on DOMContentLoaded.
 */
export function createBootstrap(
  config: GeneratedConfig,
  installPlugins?: (app: any) => Promise<void>
): (opts?: HydrationOptions) => Promise<any> {
  async function initApp(opts: HydrationOptions = {}) {
    const { installPlugins: overridePlugins, ...rest } = opts as any;
    const plugins = overridePlugins || installPlugins;
    return coreHydrate(config, {
      recoverState: true,
      reattachListeners: true,
      reconnectServices: true,
      validateVersion: true,
      ...rest,
      installPlugins: plugins,
    });
  }

  if (typeof window !== 'undefined') {
    (window as any).initApp = initApp;

    if (!(window as any).__ux3App) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          initApp().catch((e) => console.error('[UX3]', e));
        });
      } else {
        initApp().catch((e) => console.error('[UX3]', e));
      }
    }
  }

  return initApp;
}

export default createBootstrap;
