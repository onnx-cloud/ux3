/**
 * Router Service – path matching, navigation, and NavConfig management
 * Implements the navigation model from NAV.md
 */

import type { StateMachine } from '../fsm/state-machine.ts';

export interface RouteConfig {
  path: string;
  view: string;
}

export interface RouteMatch {
  path: string;
  view: string;
  params: Record<string, string>;
}

export interface NavRoute {
  path: string;           // e.g., "/market"
  view: string;          // FSM name without "FSM" suffix, e.g., "market"
  label?: string;        // i18n key or label, e.g., "header.market"
  params?: string[];     // e.g., ["exchange"] for "/market/:exchange"
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
      // Extract path parameters
      const paramMatch = route.path.match(/:(\w+)/g);
      const params = paramMatch ? paramMatch.map(p => p.slice(1)) : undefined;

      // Derive label from i18n or use view name
      let label: string | undefined;
      if (route.view === 'home') label = 'header.home';
      else if (route.view === 'market') label = 'header.market';
      else if (route.view === 'account') label = 'header.account';

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
        // Check if the target view exists and is registered
        const fsmName = `${targetView}FSM`;
        const machine = this.machines.get(fsmName);
        if (!machine) return false;

        // Check if target FSM is in a state with a template
        // (This is a simplification; full implementation would check machine.getStateConfig)
        return true;
      },
      getLabel: (route: NavRoute, i18nData: Record<string, any> = i18n) => {
        if (!route.label) return route.view;

        // Resolve i18n key
        const parts = route.label.split('.');
        let value: any = i18nData;
        for (const part of parts) {
          value = value?.[part];
        }

        if (typeof value === 'string') return value;
        return route.view;
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
  addRoute(path: string, view: string): void {
    this.routes.push({ path, view });
    this.navConfig = this.buildNavConfig(this.i18n);
  }

  /**
   * Update current path/view/params in NavConfig
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
