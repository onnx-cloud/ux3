/**
 * Client-side navigation handler
 * Listens to URL changes, resolves the matching view, and mounts it into #ux-content.
 *
 * Design contract:
 *  - The host HTML must contain a <main id="ux-content"> placeholder.
 *  - Generated views must have registered their custom element tag
 *    (customElements.define('ux-<view>', ViewClass)) before initApp() is called.
 *  - Route matching supports :param segments (e.g. /market/:exchange).
 */

import type { AppContext } from './app.js';
import type { NavRoute } from '../services/router.js';
import { defaultLogger } from '../security/observability.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * BUG-9 fix: Match a pathname against a route pattern that may contain :param
 * segments.  Returns the extracted params on match, null otherwise.
 */
function matchPattern(
  pattern: string,
  pathname: string
): Record<string, string> | null {
  const regexStr =
    '^' + pattern.replace(/:([^/]+)/g, '(?<$1>[^/]+)') + '$';
  const m = pathname.match(new RegExp(regexStr));
  if (!m) return null;
  return (m.groups ?? {}) as Record<string, string>;
}

/**
 * Resolve the view name (and any path params) for a given pathname.
 * Returns null when no route matches.
 */
function findRouteForPath(
  pathname: string,
  routes: NavRoute[]
): { view: string; params: Record<string, string> } | null {
  for (const route of routes) {
    const params = matchPattern(route.path, pathname);
    if (params !== null) {
      return { view: route.view, params };
    }
  }
  return null;
}

/**
 * Resolve current app path, preferring hash-based SPA routes (e.g. #/market)
 * when present, then falling back to location.pathname.
 */
function currentPathname(): string {
  const hash = window.location.hash || '';
  if (hash.startsWith('#/')) {
    return hash.slice(1);
  }
  return window.location.pathname || '/';
}

/**
 * BUG-2 fix: Insert a view custom element into #ux-content.
 * Removes any currently-mounted view first (triggering its disconnectedCallback).
 * Passes route params as data attributes for the view to consume.
 */
function ensureMountPoint(): HTMLElement | null {
  let main = document.querySelector<HTMLElement>('#ux-content');
  if (main) return main;

  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  main = document.createElement('main');
  main.id = 'ux-content';
  main.role = 'main';
  main.dataset.ux3Fallback = 'true';
  document.body.appendChild(main);
  defaultLogger.warn('[Navigation] #ux-content element not found; created fallback mount point');
  return main;
}

function mountView(viewName: string, params?: Record<string, string>): void {
  const main = ensureMountPoint();
  if (!main) {
    defaultLogger.warn('[Navigation] #ux-content element not found; cannot mount view');
    return;
  }

  // Tear down existing view (fires disconnectedCallback → FSM cleanup)
  while (main.firstChild) {
    main.removeChild(main.firstChild);
  }

  const tagName = `ux-${viewName}`;
  if (!customElements.get(tagName)) {
    defaultLogger.warn(
      `[Navigation] Custom element <${tagName}> is not registered. ` +
      `Ensure the view file is imported before initApp() is called.`
    );
    return;
  }

  const el = document.createElement(tagName);
  
  // Pass route params as data attributes
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      el.setAttribute(`data-param-${key}`, value);
    }
  }
  
  main.appendChild(el);
  defaultLogger.info(`[Navigation] Mounted <${tagName}> into #ux-content`, params ? { params } : {});
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize client-side navigation.
 * Call once on app startup to wire up URL → view-mount.
 */
export function setupNavigation(appContext: AppContext): void {
  if (!appContext.nav) {
    defaultLogger.warn('[Navigation] NavConfig not found in AppContext; skipping setup');
    return;
  }

  // Handle back/forward button (popstate)
  window.addEventListener('popstate', () => {
    handleNavigationEvent(appContext);
  });

  // Handle hash-based navigation changes (#/path)
  window.addEventListener('hashchange', () => {
    handleNavigationEvent(appContext);
  });

  // Handle all anchor clicks (SPA link interception)
  document.addEventListener('click', (event: Event) => {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');

    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('?')) {
      return; // External, hash-only, or query-only link — let browser handle
    }

    // Hash-based SPA route (e.g. #/capabilities/platform)
    if (href.startsWith('#/')) {
      event.preventDefault();
      navigateTo(href.slice(1), appContext, true);
      return;
    }

    if (href.startsWith('#')) {
      return; // non-route hash anchor
    }

    // Check if link is explicitly disabled
    if (anchor.hasAttribute('disabled') || anchor.classList.contains('disabled')) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    navigateTo(href, appContext);
  });

  // Mount the view that corresponds to the current URL on page load
  handleNavigationEvent(appContext);
}

/**
 * Navigate to a path programmatically (updates history + mounts the view).
 */
export function navigateTo(pathname: string, appContext: AppContext, useHash: boolean = false): void {
  if (!appContext.nav) {
    defaultLogger.warn('[Navigation] NavConfig not found; cannot navigate');
    return;
  }

  const match = findRouteForPath(pathname, appContext.nav.routes);

  if (!match) {
    defaultLogger.warn(`[Navigation] No route found for path: ${pathname}`);
    return;
  }

  const { view: targetView, params } = match;

  if (!appContext.nav.canNavigate(targetView)) {
    defaultLogger.warn(`[Navigation] Cannot navigate to view: ${targetView}`);
    return;
  }

  // Update browser location before mounting so the view can read the correct URL.
  if (useHash) {
    window.location.hash = pathname;
  } else {
    window.history.pushState({ view: targetView, path: pathname }, '', pathname);
  }
  mountView(targetView, params);
  defaultLogger.info(`[Navigation] Navigated to ${pathname} (view: ${targetView})`);
}

/**
 * Handle navigation based on current window.location.
 * Called on popstate and on initial page load.
 */
function handleNavigationEvent(appContext: AppContext): void {
  if (!appContext.nav) return;

  const pathname = currentPathname();
  const match = findRouteForPath(pathname, appContext.nav.routes);

  const targetView = match?.view ?? 'home';
  const params = match?.params;

  if (!match) {
    defaultLogger.warn(`[Navigation] No route for path: ${pathname}; mounting default view '${targetView}'`);
  }

  mountView(targetView, params);
}
