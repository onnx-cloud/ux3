/**
 * Widget System - Core Abstractions
 *
 * Widgets are the core abstraction for UI composition:
 * - Bind to state machines and templates
 * - Support nesting and composition
 */
import { StateMachine } from "../../fsm/index.js";
import { AppContext } from "../app";
/**
 * Widget Configuration
 * Defines metadata for widget factory and declarative behavior
 */
export interface WidgetConfig {
    name: string;
    state?: string;
    style?: string;
    template?: string;
    props?: Record<string, any>;
}
export interface Widget extends HTMLElement {
    app: AppContext;
    widget: WidgetConfig;
    state: StateMachine<any>;
    classes: string;
    inState(): boolean;
    context(): Record<string, any>;
}
/**
 * Widget Factory
 * Creates widget instances based on configuration and app context
 *
 * Widgets are web components.
 */
export interface WidgetFactory {
    create(app: AppContext, config: WidgetConfig): Widget;
}
