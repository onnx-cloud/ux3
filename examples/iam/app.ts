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

/**
 * Global app instance
 */
let appInstance: AppContext | null = null;

/**
 * Initialize the IAM application
 */
export async function initializeApp(): Promise<AppContext> {
  try {
    console.log('[IAM] Initializing application...');
    
    // Create the app context from generated config
    appInstance = await createAppContext(config);
    
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
