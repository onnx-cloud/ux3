/**
 * Browser Plugin for UX3
 *
 * Detects and injects browser state (locale, device type, preferences, connectivity, etc.)
 * into the app context for use in FSMs and templates.
 */

// general type helper for Node-style require if necessary
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

import type { Plugin } from '@ux3/plugin/registry';
import type { AppContext } from '@ux3/ui/app';

import { gatherBrowserState } from './detector.js';
import type { BrowserState, BrowserPluginConfig } from './types.js';

export const BrowserPlugin: Plugin = {
  name: '@ux3/plugin-browser',
  version: '1.0.0',
  description: 'Detects and injects browser state (locale, device, preferences, connectivity)',
  ux3PeerVersion: '>=1.0.0',

  install(app: AppContext) {
    // Load config
    const cfg: BrowserPluginConfig = (app.config as any)?.plugins?.['@ux3/plugin-browser'] ?? {};
    const injectToUI = cfg.injectToUI !== false;
    const trackConnectivity = cfg.trackConnectivity !== false;

    // Gather initial browser state
    const initialState = gatherBrowserState();

    // Inject into app.ui if requested
    if (injectToUI) {
      app.ui = app.ui || {};
      (app.ui as any).browser = initialState;
    }

    // Expose utility to access browser state
    app.utils = app.utils || {};
    (app.utils as any).getBrowserState = () => {
      return gatherBrowserState();
    };

    // Expose utility to check specific capabilities
    (app.utils as any).hasCapability = (capability: string): boolean => {
      const state = gatherBrowserState();
      const checks: Record<string, boolean> = {
        touchable: state.device.isTouchable,
        online: state.connectivity.isOnline,
        darkMode: state.preferences.isDarkMode === true,
        lightMode: state.preferences.isDarkMode === false,
        reducedMotion: state.preferences.prefersReducedMotion,
        reducedTransparency: state.preferences.prefersReducedTransparency,
        highContrast: state.preferences.prefersHighContrast,
        mobile: state.device.type === 'mobile',
        tablet: state.device.type === 'tablet',
        desktop: state.device.type === 'desktop',
        retina: state.device.pixelRatio >= 2,
      };

      return checks[capability] ?? false;
    };

    // Track online/offline status if enabled
    if (trackConnectivity && typeof window !== 'undefined') {
      const updateConnectivity = () => {
        if (injectToUI) {
          const newState = gatherBrowserState();
          const oldOnline = (app.ui.browser as any).connectivity.isOnline;
          const newOnline = newState.connectivity.isOnline;

          (app.ui as any).browser = newState;

          // Trigger onChange callback if connectivity changed
          if (oldOnline !== newOnline && cfg.onChange) {
            cfg.onChange(newState);
          }
        }
      };

      window.addEventListener('online', updateConnectivity);
      window.addEventListener('offline', updateConnectivity);

      // Also listen for connectivity changes via Network Information API if available
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn && conn.addEventListener) {
        conn.addEventListener('change', updateConnectivity);
      }
    }

    // Log that plugin was installed
    (app.logger as any)?.log?.('plugin.browser.install', {
      browser: initialState.browser.name,
      device: initialState.device.type,
      locale: initialState.locale.locale,
    });
  },
};

export default BrowserPlugin;

export type { BrowserState, BrowserPluginConfig } from './types.js';
export {
  detectBrowser,
  detectOS,
  detectDevice,
  detectLocale,
  detectPreferences,
  detectConnectivity,
  gatherBrowserState,
} from './detector.js';
