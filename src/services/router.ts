/**
 * Router Service – path matching, navigation, and NavConfig management
 * Implements the navigation model from NAV.md
 */

import type { StateMachine } from '../fsm/state-machine.js';

export interface RouteConfig {
  path: string;
  view: string;
  label?: string;
}

export interface RouteMatch {
  path: string;
  view: string;
  params: Record<string, string>;
}

export interface NavRoute {
  path: string;           // 
  view: string;          // FSM name
  label?: string;        // i18n key or label, e.g., "header.market"
  params?: string[];     // query params in the path, e.g., ["id"] for "/market/:id"
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
    const navRoutes: NavRoute[] = [];

    for (const route of this.routes) {
      const paramMatch = route.path.match(/:(\w+)/g);
      const params = paramMatch ? paramMatch.map(p => p.slice(1)) : undefined;

      const label = route.label || `nav.${route.view}`;

      navRoutes.push({
        path: route.path,
        view: route.view,
        label,
        params,
      });
    }

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
      getLabel: (route: NavRoute, i18nData: Record<string, any> = i18n) => {
        if (!route.label) return route.view;

        // Plain-text labels (no dots, or dots but not an i18n key path): use directly
        if (!route.label.includes('.')) return route.label;
        if (!route.label.startsWith('nav.') && !route.label.startsWith('header.') && !route.label.startsWith('i18n.')) {
          return route.label;
        }

        const parts = route.label.split('.');
        let value: unknown = i18nData;
        for (const part of parts) {
          if (typeof value === 'object' && value !== null) {
            value = (value as Record<string, unknown>)[part];
          } else {
            break;
          }
        }

        if (typeof value === 'string') return value;
        return route.label;
      },
    };
  }

  /**
   * Match a pathname against configured routes, returning params
   */
  matchRoute(pathname: string): RouteMatch | null {
    for (const route of this.routes) {
      const match = this.pathMatches(route.path, pathname);
      if (match) {
        return {
          path: route.path,
          view: route.view,
          params: match,
        };
      }
    }
    return null;
  }

  /**
   * Test if a route path matches a pathname, extracting params
   * Supports both exact matches and :param patterns
   */
  private pathMatches(
    routePath: string,
    pathname: string
  ): Record<string, string> | null {
    const routeParts = routePath.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);

    if (routeParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const pathPart = pathParts[i];

      if (routePart.startsWith(':')) {
        // Capture parameter
        const paramName = routePart.slice(1);
        params[paramName] = pathPart;
      } else if (routePart !== pathPart) {
        // Literal mismatch
        return null;
      }
    }

    return params;
  }

  /**
   * Get current NavConfig (for passing to templates)
   */
  getNavConfig(): NavConfig {
    return this.navConfig;
  }

  /**
   * Dynamically add a route and refresh nav config
   */
  addRoute(path: string, view: string, label?: string): void {
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
