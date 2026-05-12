/**
 * Router Service – path matching, navigation, and NavConfig management
 * Implements the navigation model from NAV.md
 */

import type { StateMachine } from '../fsm/state-machine.js';

function humanize(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export interface RouteConfig {
  path: string;
  view: string;
  label?: string;
  children?: RouteConfig[];
}

export interface RouteMatch {
  path: string;
  view: string;
  params: Record<string, string>;
}

export interface NavRoute {
  path: string;
  view: string;
  label?: string;
  params?: string[];
  children?: NavRoute[];
}

export interface NavConfig {
  routes: NavRoute[];
  current: {
    path: string;
    view: string;
    params: Record<string, string>;
  };
  canNavigate(targetView: string): boolean;
  getLabel(route: NavRoute, i18n?: Record<string, any>): string;
}

/**
 * Router – matches paths to routes, builds NavConfig from manifest
 */
export class Router {
  private routes: RouteConfig[];
  private machines: Map<string, StateMachine<any>>;
  private navConfig: NavConfig;
  private i18n: Record<string, any>;

  constructor(
    routes: RouteConfig[],
    machines: Map<string, StateMachine<any>>,
    i18n: Record<string, any> = {}
  ) {
    this.routes = routes;
    this.machines = machines;
    this.i18n = i18n;
    this.navConfig = this.buildNavConfig(i18n);
  }

  /**
   * Build NavConfig from routes and machines
   */
  private buildNavConfig(i18n: Record<string, any>): NavConfig {
    const buildRoute = (route: RouteConfig): NavRoute => {
      const paramMatch = route.path.match(/:(\w+)/g);
      const params = paramMatch ? paramMatch.map(p => p.slice(1)) : undefined;
      const label = route.label || `nav.${route.view}`;
      return {
        path: route.path,
        view: route.view,
        label,
        params,
        children: route.children?.length ? route.children.map(buildRoute) : undefined,
      };
    };

    const navRoutes = this.routes.map(buildRoute);

    return {
      routes: navRoutes,
      current: {
        path: '/',
        view: 'home',
        params: {},
      },
      canNavigate: (targetView: string) => {
        return this.machines.has(targetView);
      },
      getLabel: (route: NavRoute, i18nData?: Record<string, any>) => {
        if (!route.label) return humanize(route.view);
        // Simple key — literal text
        if (!route.label.includes('.')) return route.label;

        // Resolve from provided i18n data, or current locale's bundle, or fallback
        const bundle = i18nData ?? this.getCurrentI18nBundle();
        const value = bundle ? resolveI18nKey(bundle, route.label) : undefined;
        if (typeof value === 'string') return value;
        return humanize(route.view);
      },
    };
  }

  /**
   * Match a pathname against configured routes (searches recursively through children)
   */
  matchRoute(pathname: string): RouteMatch | null {
    return this.matchInTree(this.routes, pathname);
  }

  private matchInTree(routes: RouteConfig[], pathname: string): RouteMatch | null {
    for (const route of routes) {
      const match = this.pathMatches(route.path, pathname);
      if (match) {
        return { path: route.path, view: route.view, params: match };
      }
    }
    for (const route of routes) {
      if (route.children?.length) {
        const childMatch = this.matchInTree(route.children, pathname);
        if (childMatch) return childMatch;
      }
    }
    return null;
  }

  /**
   * Test if a route path matches a pathname, extracting params.
   * Supports exact matches, :param segments, * wildcard, and ** recursive.
   */
  private pathMatches(
    routePath: string,
    pathname: string
  ): Record<string, string> | null {
    // ** recursive wildcard: /docs/** matches /docs/a/b/c
    if (routePath.endsWith('/**')) {
      const prefix = routePath.slice(0, -3).replace(/\/$/, '');
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        const rest = pathname.slice(prefix.length).replace(/^\//, '');
        return { '**': rest, '*': rest, _: rest };
      }
      return null;
    }

    // * single-segment wildcard: /content/* matches /content/welcome
    const wildcardIdx = routePath.indexOf('*');
    if (wildcardIdx !== -1) {
      const prefix = routePath.slice(0, wildcardIdx).replace(/\/$/, '');
      if (!pathname.startsWith(prefix + '/') && pathname !== prefix) return null;
      const rest = pathname.slice(prefix.length).replace(/^\//, '');
      // Only match a single segment (no slashes in rest)
      if (rest.includes('/')) return null;
      const params: Record<string, string> = {};
      const prefixSegs = prefix.split('/').filter(Boolean);
      const pathSegs = pathname.split('/').filter(Boolean);
      for (let i = 0; i < prefixSegs.length; i++) {
        if (prefixSegs[i].startsWith(':')) {
          params[prefixSegs[i].slice(1)] = pathSegs[i] || '';
        }
      }
      params['*'] = rest;
      params['_'] = rest;
      return params;
    }

    const routeParts = routePath.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);

    if (routeParts.length !== pathParts.length) return null;

    const params: Record<string, string> = {};

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const pathPart = pathParts[i];

      if (routePart.startsWith(':')) {
        params[routePart.slice(1)] = pathPart;
      } else if (routePart !== pathPart) {
        return null;
      }
    }

    return params;
  }

  /**
   * Get the i18n bundle for the current locale, falling back to the stored reference.
   */
  private getCurrentI18nBundle(): Record<string, any> | undefined {
    try {
      const app = (window as any).__ux3App;
      if (app?.config?.i18n) {
        const localeSvc = app.locale;
        const lang = localeSvc?.locale?.language || 'en';
        return app.config.i18n[lang] || app.config.i18n['en'];
      }
    } catch {}
    return this.i18n;
  }

  /**
   * Get current NavConfig (for passing to templates)
   */
  getNavConfig(): NavConfig {
    return this.navConfig;
  }

  /**
   * Dynamically add a route and refresh nav config.
   * If parentPath is given, the route is nested as a child of that parent.
   */
  addRoute(path: string, view: string, label?: string, parentPath?: string): void {
    if (parentPath) {
      const parent = findRouteByPath(this.routes, parentPath);
      if (parent) {
        if (!parent.children) parent.children = [];
        if (!parent.children.some((c) => c.path === path)) {
          parent.children.push({ path, view, label });
        }
        // Remove stale flat top-level duplicate (may have been added at build time)
        removeRouteByPath(this.routes, path);
        this.navConfig = this.buildNavConfig(this.i18n);
        return;
      }
    }
    if (this.routes.some((r) => r.path === path)) return;
    this.routes.push({ path, view, label });
    this.navConfig = this.buildNavConfig(this.i18n);
  }

  /**
   * Update current path/widget/params in NavConfig
   */
  updateCurrent(pathname: string): void {
    const match = this.matchRoute(pathname);
    if (match) {
      this.navConfig.current = {
        path: pathname,
        view: match.view,
        params: match.params,
      };
    }
  }

  /**
   * Navigate to a path (updates current state)
   */
  navigate(pathname: string): RouteMatch | null {
    const match = this.matchRoute(pathname);
    if (match) {
      this.updateCurrent(pathname);
      return match;
    }
    return null;
  }
}

function resolveI18nKey(bundle: Record<string, any>, key: string): string | undefined {
  if (typeof bundle[key] === 'string') return bundle[key];
  const parts = key.split('.');
  let value: any = bundle;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }
  return typeof value === 'string' ? value : undefined;
}

function findRouteByPath(routes: RouteConfig[], path: string): RouteConfig | null {
  for (const route of routes) {
    if (route.path === path) return route;
  }
  for (const route of routes) {
    if (route.children?.length) {
      const found = findRouteByPath(route.children, path);
      if (found) return found;
    }
  }
  return null;
}

function removeRouteByPath(routes: RouteConfig[], path: string): boolean {
  for (let i = 0; i < routes.length; i++) {
    if (routes[i].path === path) {
      routes.splice(i, 1);
      return true;
    }
    if (routes[i].children?.length) {
      if (removeRouteByPath(routes[i].children!, path)) return true;
    }
  }
  return false;
}
