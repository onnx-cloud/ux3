/**
 * Client-side navigation handler
 * Listens to URL changes, updates Router state, and dispatches FSM navigation events
 */

import type { AppContext } from './app.js';
import { FSMRegistry } from '../fsm/registry.js';

/**
 * Initialize client-side navigation
 * Call once on app startup to wire up URL → FSM navigation
 */
export function setupNavigation(appContext: AppContext): void {
  if (!appContext.nav) {
    console.warn('[Navigation] NavConfig not found in AppContext; skipping setup');
    return;
  }

  // Handle back/forward button (popstate)
  window.addEventListener('popstate', () => {
    handleNavigationEvent(appContext);
  });

  // Handle all anchor clicks
  document.addEventListener('click', (event: Event) => {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');

    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('?')) {
      return; // External or hash/query-only link
    }

    // Check if link is disabled
    if (anchor.hasAttribute('disabled') || anchor.classList.contains('disabled')) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    navigateTo(href, appContext);
  });

  // Initialize current path on page load
  handleNavigationEvent(appContext);
}

/**
 * Navigate to a path programmatically
 */
export function navigateTo(pathname: string, appContext: AppContext): void {
  if (!appContext.nav) {
    console.warn('[Navigation] NavConfig not found; cannot navigate');
    return;
  }

  // Try to find the target view
  let targetView: string | null = null;
  for (const route of appContext.nav.routes) {
    if (route.path === pathname) {
      targetView = route.view;
      break;
    }
  }

  if (!targetView) {
    console.warn(`[Navigation] No route found for path: ${pathname}`);
    return;
  }

  // Check if target view is navigable
  if (!appContext.nav.canNavigate(targetView)) {
    console.warn(`[Navigation] Cannot navigate to view: ${targetView} (FSM not registered or unreachable)`);
    return;
  }

  // Dispatch NAVIGATE event to the target view's FSM
  const fsmName = `${targetView}FSM`;
  const fsm = FSMRegistry.get(fsmName);

  if (!fsm) {
    console.warn(`[Navigation] FSM not found: ${fsmName}`);
    return;
  }

  // Update browser history
  window.history.pushState({ view: targetView, path: pathname }, '', pathname);

  // Send NAVIGATE event to FSM
  fsm.send('NAVIGATE');

  console.log(`[Navigation] Navigated to ${pathname} (view: ${targetView})`);
}

/**
 * Handle navigation based on current window location
 */
function handleNavigationEvent(appContext: AppContext): void {
  if (!appContext.nav) return;

  const pathname = window.location.pathname;

  // Match current pathname to route
  let targetView: string | null = null;
  for (const route of appContext.nav.routes) {
    if (route.path === pathname) {
      targetView = route.view;
      break;
    }
  }

  if (!targetView) {
    console.warn(`[Navigation] No route for current path: ${pathname}; defaulting to home`);
    targetView = 'home';
  }

  // Send NAVIGATE event to target FSM
  const fsmName = `${targetView}FSM`;
  const fsm = FSMRegistry.get(fsmName);

  if (fsm) {
    fsm.send('NAVIGATE');
  }
}
