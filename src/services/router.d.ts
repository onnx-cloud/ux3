import type { StateMachine } from '../fsm/state-machine.ts';
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
export declare class Router {
    private routes;
    private machines;
    private navConfig;
    private i18n;
    constructor(routes: RouteConfig[], machines: Map<string, StateMachine<any>>, i18n?: Record<string, any>);
    private buildNavConfig;
    private getCurrentI18nBundle;
    matchRoute(pathname: string): RouteMatch | null;
    private pathMatches;
    getNavConfig(): NavConfig;
    addRoute(path: string, view: string, label?: string, parentPath?: string): void;
    updateCurrent(pathname: string): void;
    navigate(pathname: string): RouteMatch | null;
}
