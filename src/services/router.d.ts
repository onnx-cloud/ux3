import type { StateMachine } from '../fsm/state-machine.ts';
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
    tree: NavTree;
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
export declare class Router {
    private routes;
    private machines;
    private navConfig;
    private i18n;
    private contentManifest?;
    constructor(routes: RouteConfig[], machines: Map<string, StateMachine<any>>, i18n?: Record<string, any>, contentManifest?: import('./content.js').ContentManifest);
    private buildNavConfig;
    private getCurrentI18nBundle;
    matchRoute(pathname: string): RouteMatch | null;
    private pathMatches;
    getNavConfig(): NavConfig;
    getNavTree(i18nBundle: Record<string, any>, contentManifest: import('./content.js').ContentManifest | undefined, routes: NavRoute[]): NavTree;
    addRoute(path: string, view: string, label?: string, parentPath?: string, guard?: string): void;
    updateCurrent(pathname: string): void;
    navigate(pathname: string): RouteMatch | null;
}
