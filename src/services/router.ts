/**
 * Router Service – path matching, navigation, and NavConfig management
 * Implements the navigation model from NAV.md
 */

import type { StateMachine } from '../fsm/state-machine.js';
import type { ContentManifest } from './content.js';

function humanize(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export interface RouteConfig {
  path: string;
  view: string;
  name?: string;
  label?: string;
  children?: RouteConfig[];
  guard?: string;
}

export interface RouteMatch {
  path: string;
  view: string;
  params: Record<string, string>;
  guard?: string;
  breadcrumb?: Array<{ path: string; view: string; label: string }>;
}

export interface NavRoute {
  path: string;
  view: string;
  name?: string;
  label?: string;
  params?: string[];
  children?: NavRoute[];
  guard?: string;
  breadcrumb?: Array<{ path: string; view: string; label: string }>;
}

export interface NavItem {
  label: string;
  title?: string;
  icon?: string;
  image?: string;
  description?: string;
  url: string;
  children?: Record<string, NavItem>;
}

export type NavTree = Record<string, NavItem>;

export interface NavConfig {
  routes: NavRoute[];
  tree?: NavTree;
  current: {
    path: string;
    view: string;
    params: Record<string, string>;
  };
  canNavigate(targetView: string): boolean;
  canActivate(path: string): boolean;
  evaluateGuard(guardExpr: string): boolean;
  getLabel(route: NavRoute, i18n?: Record<string, any>): string;
  getBreadcrumbs(path: string): Array<{ path: string; view: string; label: string }>;
}

/**
 * Router – matches paths to routes, builds NavConfig from manifest
 */
export class Router {
  private routes: RouteConfig[];
  private machines: Map<string, StateMachine<any>>;
  private navConfig: NavConfig;
  private i18n: Record<string, any>;
  private contentManifest?: ContentManifest;

  constructor(
    routes: RouteConfig[],
    machines: Map<string, StateMachine<any>>,
    i18n: Record<string, any> = {},
    contentManifest?: ContentManifest,
  ) {
    this.routes = routes;
    this.machines = machines;
    this.i18n = i18n;
    this.contentManifest = contentManifest;
    this.navConfig = this.buildNavConfig(i18n);
  }

  private buildNavConfig(i18n: Record<string, any>): NavConfig {
    const buildRoute = (route: RouteConfig, parentPath: string = '', parentName?: string): NavRoute => {
      const paramMatch = route.path.match(/:(\w+)/g);
      const params = paramMatch ? paramMatch.map(p => p.slice(1)) : undefined;
      const routeName = route.name || (parentName ? `${parentName}.${route.view}` : route.view);
      const label = route.label ? route.label : `${routeName}.label`;
      const fullPath = parentPath ? `${parentPath}${route.path}` : route.path;

      return {
        path: fullPath,
        view: route.view,
        name: routeName,
        label,
        params,
        guard: route.guard,
        children: route.children?.length ? route.children.map((c) => buildRoute(c, fullPath, routeName)) : undefined,
      };
    };

    const navRoutes = this.routes.map((r) => buildRoute(r));

    const instance = this;
    const navTree = this.getNavTree(this.getCurrentI18nBundle() || i18n, this.contentManifest, navRoutes);

    return {
      routes: navRoutes,
      tree: navTree,
      current: {
        path: '/',
        view: 'home',
        params: {},
      },
      canNavigate: (targetView: string) => {
        return instance.machines.has(targetView);
      },
      canActivate: (path: string) => {
        const match = instance.matchRoute(path);
        if (!match || !match.guard) return true;
        return instance.evaluateGuard(match.guard);
      },
      evaluateGuard: (guardExpr: string): boolean => {
        return instance.evaluateGuard(guardExpr);
      },
      getLabel: (route: NavRoute, i18nData?: Record<string, any>) => {
        if (!route.label) return humanize(route.view);
        if (!route.label.includes('.')) return route.label;

        const bundle = i18nData ?? instance.getCurrentI18nBundle();
        const value = bundle ? resolveI18nKey(bundle, route.label) : undefined;
        if (typeof value === 'string') return value;
        return humanize(route.view);
      },
      getBreadcrumbs: (path: string): Array<{ path: string; view: string; label: string }> => {
        return instance.buildBreadcrumbs(path);
      },
    };
  }

  matchRoute(pathname: string): RouteMatch | null {
    return this.matchInTree(this.routes, pathname, '');
  }

  private matchInTree(
    routes: RouteConfig[],
    pathname: string,
    parentPath: string,
  ): RouteMatch | null {
    for (const route of routes) {
      const fullPath = parentPath ? `${parentPath}${route.path}` : route.path;
      const match = this.pathMatches(fullPath, pathname);
      if (match) {
        return {
          path: fullPath,
          view: route.view,
          params: match,
          guard: route.guard,
          breadcrumb: this.buildBreadcrumbs(fullPath),
        };
      }
      if (route.children?.length) {
        const childMatch = this.matchInTree(route.children, pathname, fullPath);
        if (childMatch) return childMatch;
      }
    }
    return null;
  }

  private pathMatches(
    routePath: string,
    pathname: string
  ): Record<string, string> | null {
    if (routePath.endsWith('/**')) {
      const prefix = routePath.slice(0, -3).replace(/\/$/, '');
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        const rest = pathname.slice(prefix.length).replace(/^\//, '');
        return { '**': rest, '*': rest, _: rest };
      }
      return null;
    }

    const wildcardIdx = routePath.indexOf('*');
    if (wildcardIdx !== -1) {
      const prefix = routePath.slice(0, wildcardIdx).replace(/\/$/, '');
      if (!pathname.startsWith(prefix + '/') && pathname !== prefix) return null;
      const rest = pathname.slice(prefix.length).replace(/^\//, '');
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

  evaluateGuard(guardExpr: string): boolean {
    if (!guardExpr) return true;

    try {
      if (guardExpr.startsWith('fsm:')) {
        const fsmRef = guardExpr.slice(4);
        const [namespace, state] = fsmRef.split(':');
        if (namespace && state) {
          const machine = this.machines.get(namespace);
          if (machine) {
            return machine.matches(state);
          }
        }
        return false;
      }

      if (guardExpr.startsWith('function:')) {
        const fnName = guardExpr.slice(9);
        if (typeof window !== 'undefined') {
          const fn = (window as any)[fnName];
          if (typeof fn === 'function') return fn();
        }
        return false;
      }

      if (guardExpr.startsWith('context:')) {
        const key = guardExpr.slice(8);
        if (typeof window !== 'undefined') {
          const app = (window as any).__ux3App;
          const val = app?.state?.[key];
          return Boolean(val);
        }
        return false;
      }

      if (guardExpr === 'true') return true;
      if (guardExpr === 'false') return false;

      const app = (window as any).__ux3App;
      if (app?.config?.development?.skipGuards === true) return true;

      return true;
    } catch {
      return true;
    }
  }

  buildBreadcrumbs(pathname: string): Array<{ path: string; view: string; label: string }> {
    const crumbs: Array<{ path: string; view: string; label: string }> = [];

    const collectAncestors = (
      routes: RouteConfig[],
      parentPath: string,
      parentCrumbs: Array<{ path: string; view: string; label: string }>,
    ): boolean => {
      for (const route of routes) {
        const fullPath = parentPath ? `${parentPath}${route.path}` : route.path;
        const match = this.pathMatches(fullPath, pathname);
        if (match) {
          const label = this.navConfig.getLabel({
            path: fullPath,
            view: route.view,
            label: route.label,
          });
          const crumbPath = Object.keys(match).reduce(
            (acc, key) => acc.replace(`:${key}`, match[key]),
            fullPath,
          );
          crumbs.push(...parentCrumbs, { path: crumbPath, view: route.view, label });
          return true;
        }

        if (route.children?.length) {
          const label = this.navConfig.getLabel({
            path: fullPath,
            view: route.view,
            label: route.label,
          });
          const newCrumbs = [...parentCrumbs, { path: fullPath, view: route.view, label }];
          if (collectAncestors(route.children, fullPath, newCrumbs)) return true;
        }
      }
      return false;
    };

    collectAncestors(this.routes, '', []);
    return crumbs;
  }

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

  getNavConfig(): NavConfig {
    return this.navConfig;
  }

  getNavTree(i18nBundle: Record<string, any>, contentManifest: ContentManifest | undefined, routes: NavRoute[]): NavTree {
    const tree: NavTree = {};

    const resolveContentMetadata = (routePath: string) => {
      if (!contentManifest?.items?.length) return undefined;
      const normalize = (value: string | undefined): string => (value || '').replace(/^\//, '');
      const normalizedRoute = normalize(routePath);

      return contentManifest.items.find((item) => {
        return normalize(item.slug) === normalizedRoute || normalize(item.file) === normalizedRoute;
      })?.frontmatter;
    };

    const buildNavItem = (route: NavRoute): NavItem => {
      const frontmatter = resolveContentMetadata(route.path) || {};
      const labelKey = route.name ? `${route.name}.label` : route.label || `nav.${route.view}`;
      const titleKey = route.name ? `${route.name}.title` : undefined;
      const descriptionKey = route.name ? `${route.name}.description` : undefined;
      const iconKey = route.name ? `${route.name}.icon` : undefined;
      const imageKey = route.name ? `${route.name}.image` : undefined;

      const label = resolveI18nKey(i18nBundle, labelKey) || (route.label && !route.label.includes('.') ? route.label : undefined) || humanize(route.view);
      const title = frontmatter.title || (titleKey ? resolveI18nKey(i18nBundle, titleKey) : undefined);
      const description = frontmatter.description || (descriptionKey ? resolveI18nKey(i18nBundle, descriptionKey) : undefined);
      const icon = iconKey ? resolveI18nKey(i18nBundle, iconKey) : undefined;
      const image = imageKey ? resolveI18nKey(i18nBundle, imageKey) : undefined;

      const item: NavItem = {
        label,
        url: route.path,
      };

      if (title) item.title = title;
      if (description) item.description = description;
      if (icon) item.icon = icon;
      if (image) item.image = image;
      return item;
    };

    const insertRoute = (route: NavRoute): void => {
      const nameParts = (route.name || route.view).split('.');
      let currentLevel = tree;
      for (let i = 0; i < nameParts.length; i += 1) {
        const key = nameParts[i];
        if (!currentLevel[key]) {
          currentLevel[key] = { label: humanize(key), url: '', children: {} };
        }
        const navItem = currentLevel[key];
        if (i === nameParts.length - 1) {
          const item = buildNavItem(route);
          currentLevel[key] = {
            ...navItem,
            ...item,
            children: Object.keys(navItem.children || {}).length ? navItem.children : undefined,
          };
        }
        if (!currentLevel[key].children) {
          currentLevel[key].children = {};
        }
        currentLevel = currentLevel[key].children!;
      }
    };

    const traverse = (routes: NavRoute[]) => {
      for (const route of routes) {
        insertRoute(route);
        if (route.children?.length) traverse(route.children);
      }
    };

    traverse(routes);
    return tree;
  }

  addRoute(path: string, view: string, label?: string, parentPath?: string, guard?: string): void {
    if (parentPath) {
      const parent = findRouteByPath(this.routes, parentPath);
      if (parent) {
        if (!parent.children) parent.children = [];
        if (!parent.children.some((c) => c.path === path)) {
          parent.children.push({ path, view, label, guard });
        }
        removeRouteByPath(this.routes, path);
        this.navConfig = this.buildNavConfig(this.i18n);
        return;
      }
    }
    if (this.routes.some((r) => r.path === path)) return;
    this.routes.push({ path, view, label, guard });
    this.navConfig = this.buildNavConfig(this.i18n);
  }

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

  navigate(pathname: string): RouteMatch | null {
    const match = this.matchRoute(pathname);
    if (match) {
      if (match.guard && !this.evaluateGuard(match.guard)) {
        return null;
      }
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
