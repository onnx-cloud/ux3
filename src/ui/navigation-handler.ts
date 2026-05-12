/**
 * Client-side navigation handler
 * Listens to URL changes, resolves the matching view, and mounts it into #ux-content.
 *
 * Design contract:
 *  - The host HTML must contain a <main id="ux-content"> placeholder.
 *  - Generated views must have registered their custom element tag
 *    (customElements.define('ux-<view>', ViewClass)) before initApp() is called.
 *  - Route matching supports :param segments (e.g. /market/:exchange).
 *  - Locale-aware routing strips/applies locale prefixes when the locale
 *    service is in prefix-optional or prefix-required mode.
 */

import type { AppContext } from './app.js';
import type { NavRoute } from '../services/router.js';
import { defaultLogger } from '../security/observability.js';

function emitDevTools(source: string, type: string, payload?: any): void {
  if (typeof window === 'undefined') return;
  const devTools = (window as any).__ux3DevTools;
  if (devTools && typeof devTools.emit === 'function') {
    devTools.emit(source, type, { ...(payload || {}), timestamp: Date.now() });
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Match a pathname against a route pattern that may contain :param
 * segments.  Returns the extracted params on match, null otherwise.
 */
function matchPattern(
  pattern: string,
  pathname: string
): Record<string, string> | null {
  const wildcardIdx = pattern.indexOf('*');
  if (wildcardIdx !== -1) {
    const prefix = pattern.slice(0, wildcardIdx).replace(/\/$/, '');
    if (!pathname.startsWith(prefix)) return null;
    const params: Record<string, string> = {};
    const prefixSegments = prefix.split('/').filter(Boolean);
    const pathSegments = pathname.split('/').filter(Boolean);
    for (let i = 0; i < prefixSegments.length; i++) {
      if (prefixSegments[i].startsWith(':')) {
        params[prefixSegments[i].slice(1)] = pathSegments[i] || '';
      }
    }
    const wildcardValue = pathname.slice(prefix.length).replace(/^\//, '');
    params['*'] = wildcardValue;
    params['_'] = wildcardValue;
    return params;
  }

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
): { view: string; params: Record<string, string>; guard?: string } | null {
  return searchTree(routes, pathname);
}

function searchTree(
  routes: NavRoute[] | undefined,
  pathname: string
): { view: string; params: Record<string, string>; guard?: string } | null {
  if (!routes) return null;
  for (const route of routes) {
    const params = matchPattern(route.path, pathname);
    if (params !== null) {
      return { view: route.view, params, guard: route.guard };
    }
  }
  for (const route of routes) {
    const childMatch = searchTree(route.children, pathname);
    if (childMatch) return childMatch;
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
 * Strip locale prefix from pathname when the locale service provides one.
 */
function stripLocalePrefix(pathname: string, prefix: string): string {
  if (!prefix || prefix === '/') return pathname;
  if (pathname === prefix) return '/';
  if (pathname.startsWith(prefix + '/')) return pathname.slice(prefix.length);
  if (pathname.startsWith(prefix)) return pathname.slice(prefix.length) || '/';
  return pathname;
}

/**
 * Insert a view custom element into #ux-content.
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

  const tagName = `ux-${viewName}`;
  if (!customElements.get(tagName)) {
    defaultLogger.warn(
      `[Navigation] Custom element <${tagName}> is not registered. ` +
      `Ensure the view file is imported before initApp() is called.`
    );
    return;
  }

  const el = document.createElement(tagName);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      el.setAttribute(`data-param-${key}`, value);
    }
  }

  const performSwap = () => {
    // Persist container height to prevent layout jumps during swap
    const prevHeight = main.offsetHeight;
    if (prevHeight > 0) {
      main.style.minHeight = `${prevHeight}px`;
    }

    // Tear down existing view
    while (main.firstChild) {
      main.removeChild(main.firstChild);
    }

    // Mount new view with entrance class
    el.classList.add('ux-view-entering');
    main.appendChild(el);

    // Remove entrance class after layout to trigger transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.remove('ux-view-entering');
        // Release min-height after transition completes
        setTimeout(() => {
          main.style.minHeight = '';
        }, 250);
      });
    });
  };

  // CSS class-based fade transition
  performSwap();

  defaultLogger.info(`[Navigation] Mounted <${tagName}> into #ux-content`, params ? { params } : {});
}

/**
 * Track current path globally so nav-panel can stay in sync.
 */
function trackCurrentPath(pathname: string): void {
  (window as any).__ux3RoutePath = pathname;
}

function mountNotFound(): void {
  const main = ensureMountPoint();
  if (!main) return;

  while (main.firstChild) {
    main.removeChild(main.firstChild);
  }

  const el = document.createElement('div');
  el.className = 'ux-not-found';
  el.setAttribute('role', 'alert');
  el.innerHTML = '<h2>404</h2><p>Page not found</p>';
  main.appendChild(el);

  defaultLogger.warn('[Navigation] No matching route; mounted 404 fallback');
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
    if (event.defaultPrevented) return;
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

  // Notify nav components that the app is ready and routes are available
  window.dispatchEvent(new CustomEvent('ux:app.route.navigate'));
}

/**
 * Navigate to a path programmatically (updates history + mounts the view).
 */
export function navigateTo(pathname: string, appContext: AppContext, useHash: boolean = false): void {
  if (!appContext.nav) {
    defaultLogger.warn('[Navigation] NavConfig not found; cannot navigate');
    return;
  }

  // Strip locale prefix before matching routes
  const localeSvc = (appContext as any).locale;
  let pathnameForLookup = pathname;
  if (localeSvc && typeof localeSvc.getRoutePrefix === 'function') {
    const prefix = localeSvc.getRoutePrefix();
    if (prefix) {
      pathnameForLookup = stripLocalePrefix(pathname, prefix);
    }
  }

  const match = findRouteForPath(pathnameForLookup, appContext.nav.routes);

  if (!match) {
    defaultLogger.warn(`[Navigation] No route found for path: ${pathname}`);
    mountNotFound();
    return;
  }

  const { view: targetView, params } = match;

  if (match.guard && appContext.nav.evaluateGuard) {
    if (!appContext.nav.evaluateGuard(match.guard)) {
      defaultLogger.warn(`[Navigation] Route guard rejected for path: ${pathname} (guard: ${match.guard})`);
      return;
    }
  }

  if (!appContext.nav.canNavigate(targetView)) {
    defaultLogger.warn(`[Navigation] Cannot navigate to view: ${targetView}`);
    return;
  }

  // Resolve locale-aware path (apply prefix if locale service provides one)
  let resolvedPath = pathname;
  if (localeSvc && typeof localeSvc.getRoutePrefix === 'function') {
    const prefix = localeSvc.getRoutePrefix();
    if (prefix && !resolvedPath.startsWith(prefix)) {
      resolvedPath = prefix + (pathnameForLookup === '/' ? '' : pathnameForLookup);
    }
  }

  // Update browser location before mounting so the view can read the correct URL.
  if (useHash) {
    window.location.hash = resolvedPath;
  } else {
    window.history.pushState({ view: targetView, path: resolvedPath }, '', resolvedPath);
  }
  mountView(targetView, params);
  trackCurrentPath(resolvedPath);
  window.dispatchEvent(new CustomEvent('ux:app.route.navigate'));
  defaultLogger.info(`[Navigation] Navigated to ${resolvedPath} (view: ${targetView})`);
  emitDevTools('navigation', 'navigate', { path: resolvedPath, view: targetView, params });
}

/**
 * Handle navigation based on current window.location.
 * Called on popstate and on initial page load.
 */
function handleNavigationEvent(appContext: AppContext): void {
  if (!appContext.nav) return;

  const rawPathname = currentPathname();

  // Strip locale prefix before matching routes
  const localeSvc = (appContext as any).locale;
  let pathnameForLookup = rawPathname;
  if (localeSvc && typeof localeSvc.getRoutePrefix === 'function') {
    const prefix = localeSvc.getRoutePrefix();
    if (prefix) {
      pathnameForLookup = stripLocalePrefix(rawPathname, prefix);
    }
  }

  const match = findRouteForPath(pathnameForLookup, appContext.nav.routes);

  if (!match) {
    defaultLogger.warn(`[Navigation] No route for path: ${rawPathname} (lookup: ${pathnameForLookup})`);
    emitDevTools('navigation', 'route.miss', { path: rawPathname, lookupPath: pathnameForLookup });
    mountNotFound();
    return;
  }

  if (match.guard && appContext.nav.evaluateGuard) {
    if (!appContext.nav.evaluateGuard(match.guard)) {
      defaultLogger.warn(`[Navigation] Route guard rejected for path: ${rawPathname} (guard: ${match.guard})`);
      emitDevTools('navigation', 'route.guard', { path: rawPathname, guard: match.guard });
      mountNotFound();
      return;
    }
  }

  mountView(match.view, match.params);
  trackCurrentPath(rawPathname);
  emitDevTools('navigation', 'route.mount', { path: rawPathname, view: match.view, params: match.params });
}
