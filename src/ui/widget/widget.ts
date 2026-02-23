/**
 * Widget System - Core Abstractions
 * 
 * Widgets are the core abstraction for UI composition:
 * - Bind to state machines and templates
 * - Support nesting and composition
 */

import { StateMachine } from "src/fsm";
import { Service } from "src/services";
import { AppContext } from "../app";

/**
 * Widget Configuration
 * Defines metadata for widget factory and declarative behavior
 */

export interface WidgetConfig {
  name: string;           // tag name (dots to dashes for web component) 
  state?: string;         // FSM state binding (behavior depends on FSM.state)
  style?: string;           // named style set (see style system)
  template?: string;      // Path to HTML template
  props?: Record<string, any>;  // Compile-time props
}

export interface Widget extends HTMLElement {
  app: AppContext
  widget: WidgetConfig;
  state: StateMachine<any>; // bound FSM
  classes: string; // normalized CSS styles (dereferenced from style system)
  inState(): boolean; // check if bound FSM is in state (stateless are always true)
  context(): Record<string, any>; // get FSM context (stateless return {})
}

/**
 * Widget Factory 
 * Creates widget instances based on configuration and app context
 * 
 * Widgets are web components.
 */

export interface WidgetFactory {
  create(app: AppContext, config: WidgetConfig ): Widget;
}

