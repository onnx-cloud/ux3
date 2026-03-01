/**
 * IAM Example Application
 * Full-stack demo of UX3's config-only development approach
 * 
 * This app loads the generated configuration and makes it available to the UI.
 */

import { createAppContext } from '@ux3/ui/context-builder';
import { setupNavigation } from '@ux3/ui/navigation-handler';
import { config } from './generated/config.js';
import type { AppContext } from '@ux3/ui/app';
import { ViewComponent } from '@ux3/ui';
import { registerStyles, initStyleRegistry } from '@ux3/ui/style-registry';

// -----------------------------------------------------------------------------
// style registry – map keys used in templates to Tailwind utility lists.  the
// shared `@ux3/ui/style-registry` module handles runtime injection (view
// components and DOMContentLoaded) so we just need to register our map here.
// -----------------------------------------------------------------------------
const styles: Record<string,string> = {
  widget: 'p-4 bg-white rounded shadow',
  actions: 'flex gap-2 mt-2',
  spinner: 'animate-spin h-5 w-5 text-gray-500',
  alert: 'p-3 bg-red-100 text-red-700 rounded',
  'upgrade.modal': 'p-6 bg-white rounded shadow-lg max-w-md mx-auto',
  'payment.form': 'space-y-4',
  // manually-added overrides can sit alongside generated entries
};

// load YAML compositions so that the registry mirrors ux/style/compositions
// without hard‑coding each key. requires Vite-style glob support (used by the
// build system already for plugins, etc.).
if (typeof import.meta !== 'undefined' && import.meta.glob) {
  const files = import.meta.glob('./ux/style/compositions/**/*.yaml', { eager: true });
  const mergeStyles = (obj: any, prefix = '') => {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') {
        styles[key] = v;
      } else if (v && typeof v === 'object') {
        if (typeof v.base === 'string') {
          styles[key] = v.base;
        }
        mergeStyles(v, key);
      }
    }
  };
  for (const path in files) {
    const mod: any = (files as any)[path];
    mergeStyles(mod);
  }
}

// register and kick off automatic injection
registerStyles(styles);
initStyleRegistry();

// built-in plugins
import { SpaCore } from '../src/plugins/spa-core';
import { SpaRouter } from '../src/plugins/spa-router';
import { SpaForms } from '../src/plugins/spa-forms';
import { SpaAuth } from '../src/plugins/spa-auth';

/**
 * Global app instance
 */
let appInstance: AppContext | null = null;


// ---------------------------------------------------------------------------
// Hydration helpers (for SPA entry point)
// ---------------------------------------------------------------------------

export interface HydrationOptions {
  recoverState?: boolean;        // restore FSM state from `window.__INITIAL_STATE__`
  reattachListeners?: boolean;   // wire up ux-event directives
  reconnectServices?: boolean;   // resume HTTP/WS/RPC services
  validateVersion?: boolean;     // check bundle/config version match
}

/**
 * Hydrate an already-rendered server page into a live SPA.  This function is
 * used by the browser entry point (examples/iam/index.ts) and may also be
 * called manually in tests.
 */
export async function hydrate(
  config: typeof import('./generated/config.js').config,
  options: HydrationOptions = {}
): Promise<AppContext> {
  const app = await createAppContext(config);

  // NOTE: early hook execution would occur here if a full hook system exists
  if (options.recoverState && typeof window !== 'undefined') {
    const initial = (window as any).__INITIAL_STATE__;
    if (initial) {
      // assume app.recoverState exists on context-builder
      (app as any).recoverState?.(initial);
    }
  }

  if (options.reattachListeners) {
    (app as any).reattachListeners?.();
  }

  if (options.reconnectServices) {
    try {
      await (app as any).reconnectServices?.();
    } catch (err) {
      console.warn('[IAM] service reconnection failed', err);
    }
  }

  // ready
  return app;
}

/**
 * Initialize the IAM application
 */
export async function initializeApp(): Promise<AppContext> {
  try {
    console.log('[IAM] Initializing application...');
    
    // Create the app context from generated config
    appInstance = await createAppContext(config);

    // add a version string for bundle compatibility checks
    if (appInstance.config) {
      appInstance.config.version = appInstance.config.version || '1.0.0';
      // add script asset pointing at build output
      appInstance.config.site = appInstance.config.site || {};
      appInstance.config.site.assets = appInstance.config.site.assets || [];
      appInstance.config.site.assets.push({
        type: 'script',
        src: '/dist/app.bundle.js',
        defer: true,
        version: appInstance.config.version
      });
    }

    // install built-in plugins so their hooks/services are available
    const plugins = [SpaCore, SpaRouter, SpaForms, SpaAuth];
    plugins.forEach(p => {
      try {
        appInstance.services = appInstance.services || {};
        p.install?.(appInstance as any);
      } catch (e) {
        console.warn('[IAM] plugin install failed', p.name, e);
      }
    });

    // auto-load project-specific plugins from `examples/iam/plugins` using
    // Vite's glob import syntax (eager so that modules are included in bundle).
    if (typeof import.meta !== 'undefined' && import.meta.glob) {
      const mods = import.meta.glob('../plugins/*.{ts,js}', { eager: true });
      for (const path in mods) {
        // each module should export default Plugin
        const mod: any = (mods as any)[path];
        const pl = mod?.default;
        if (pl && typeof pl.install === 'function') {
          try {
            pl.install(appInstance as any);
          } catch (e) {
            console.warn('[IAM] project plugin install failed', path, e);
          }
        }
      }
    }
    
    console.log('[IAM] ✓ Application initialized', {
      routes: config.routes.length,
      services: Object.keys(appInstance.services).length,
      machines: Object.keys(appInstance.machines).length,
    });
    
    // Setup client-side navigation (URL → FSM routing)
    setupNavigation(appInstance);
    
    // Setup telemetry
    setupTelemetry();
    
    // Setup error handling
    setupErrorHandling();
    
    // Export globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).__iamApp = appInstance;
      (window as any).__iamConfig = config;
    }
    
    return appInstance;
  } catch (error) {
    console.error('[IAM] Initialization failed:', error);
    throw error;
  }
}

/**
 * Mount the app to the DOM
 */
export async function mountApp(selectorOrElement: string | HTMLElement = '#app'): Promise<AppContext> {
  // Initialize if not already done
  if (!appInstance) {
    appInstance = await initializeApp();
  }
  
  // Get root element
  const rootEl = typeof selectorOrElement === 'string'
    ? document.querySelector(selectorOrElement)
    : selectorOrElement;
    
  if (!rootEl) {
    throw new Error(`Root element not found: ${selectorOrElement}`);
  }
  
  // Create root view component
  const rootView = document.createElement('ux-root-view');
  rootView.setAttribute('ux-fsm', 'rootFSM');
  rootView.setAttribute('ux-layout', 'root');
  rootView.setAttribute('ux-view', 'root');
  
  // Clear and mount
  rootEl.innerHTML = '';
  rootEl.appendChild(rootView);
  
  console.log('[IAM] ✓ App mounted to', selectorOrElement);
  
  return appInstance;
}

/**
 * Get the app instance
 */
export function getApp(): AppContext {
  if (!appInstance) {
    throw new Error('App not initialized. Call initializeApp() first.');
  }
  return appInstance;
}

/**
 * Setup telemetry collection
 */
function setupTelemetry(): void {
  const events: any[] = [];
  
  if (typeof window !== 'undefined') {
    (window as any).__ux3Telemetry = (eventType: string, data: any) => {
      const event = {
        type: eventType,
        data,
        timestamp: Date.now(),
      };
      
      events.push(event);
      
      // Log important events
      if (eventType.startsWith('fsm:') || eventType.startsWith('service:')) {
        console.log(`[IAM Telemetry] ${eventType}`, data);
      }
      
      // Send to analytics in production
      if (import.meta.env.PROD) {
        // Would send to analytics service here
      }
    };
    
    // Expose events for debugging
    (window as any).__iamEvents = events;
  }
}

/**
 * Setup error handling
 */
function setupErrorHandling(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      console.error('[IAM] Uncaught error:', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[IAM] Unhandled promise rejection:', event.reason);
    });
  }
}

/**
 * Navigate to a route
 */
export async function navigate(path: string): Promise<void> {
  const app = getApp();
  
  // Find matching route
  const route = config.routes.find(r => r.path === path);
  if (!route) {
    console.warn('[IAM] Route not found:', path);
    return;
  }
  
  console.log(`[IAM] Navigating to ${path} (view: ${route.view})`);
  
  // Update URL
  if (typeof window !== 'undefined') {
    window.history.pushState({ path }, '', path);
  }
  
  // Trigger view change
  // In a full router, this would dispatch navigation events
}

/**
 * Login helper
 */
export async function login(email: string, password: string): Promise<boolean> {
  const app = getApp();
  
  try {
    // Get login service
    const authService = app.services['auth'];
    if (!authService) {
      throw new Error('Auth service not found');
    }
    
    // Call login endpoint
    const result = await authService.call?.('login', { email, password });
    
    console.log('[IAM] Login successful:', result);
    return true;
  } catch (error) {
    console.error('[IAM] Login failed:', error);
    return false;
  }
}

/**
 * Logout helper
 */
export async function logout(): Promise<void> {
  const app = getApp();
  
  try {
    const authService = app.services['auth'];
    if (authService) {
      await authService.call?.('logout', {});
    }
    
    console.log('[IAM] Logout successful');
  } catch (error) {
    console.error('[IAM] Logout failed:', error);
  }
}

/**
 * Auto-initialize on module load
 */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeApp().catch(console.error);
    });
  } else {
    initializeApp().catch(console.error);
  }
}

// Export config for reference
export { config };
export type { AppContext };

export default {
  initializeApp,
  mountApp,
  getApp,
  navigate,
  login,
  logout,
};
