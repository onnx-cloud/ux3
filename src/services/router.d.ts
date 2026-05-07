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
    path: string;
    view: string;
    label?: string;
    params?: string[];
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
export declare class Router {
    private routes;
    private machines;
    private navConfig;
    private i18n;
    constructor(routes: RouteConfig[], machines: Map<string, StateMachine<any>>, i18n?: Record<string, any>);
    /**
     * Build NavConfig from routes and machines
     */
    private buildNavConfig;
    /**
     * Match a pathname against configured routes, returning params
     */
    matchRoute(pathname: string): RouteMatch | null;
    /**
     * Test if a route path matches a pathname, extracting params
     * Supports both exact matches and :param patterns
     */
    private pathMatches;
    /**
     * Get current NavConfig (for passing to templates)
     */
    getNavConfig(): NavConfig;
    /**
     * Dynamically add a route and refresh nav config
     */
    addRoute(path: string, view: string): void;
    /**
     * Update current path/widget/params in NavConfig
     */
    updateCurrent(pathname: string): void;
    /**
     * Navigate to a path (updates current state)
     */
    navigate(pathname: string): RouteMatch | null;
}
