/**
 * ViewComponent - Base class for FSM-driven views
 * Handles layout mounting, FSM binding, template swapping, and event delegation
 */

import { StateMachine } from '../fsm/state-machine.js';
import type { AppContext } from './app.js';

// expose global for runtime
declare global {
  interface Window {
    __ux3App?: AppContext;
    __ux3Telemetry?: (event: string, data: unknown) => void;
  }
}
import { stampTemplate } from './template-stamp.js';
import { observeSlot, getAssignedElements } from './slot-utils.js';

/**
 * Template bindings metadata
 */
export interface TemplateBindings {
  events: Array<{ element: string; event: string; action: string }>;
  reactive: Array<{ element: string; property: string; signal: string }>;
  i18n: Array<{ element: string; key: string }>;
  widgets: Array<{ element: string; name: string }>;
}

/**
 * ViewComponent - Base Web Component for FSM-driven views
 * Each view has:
 * - A layout (shared HTML structure)
 * - An FSM (state machine managing transitions)
 * - Templates (HTML for each FSM state)
 * - Bindings (event listeners, reactive updates, etc.)
 */
export abstract class ViewComponent<Context extends Record<string, unknown> = Record<string, unknown>> extends HTMLElement {
  protected app!: AppContext<Context>;
  protected fsm!: StateMachine<Context>;
  protected layout: string = '';
  protected currentState: string = '';
  protected templates: Map<string, string> = new Map();
  protected bindings: TemplateBindings = {
    events: [],
    reactive: [],
    i18n: [],
    widgets: [],
  };

  private unsubscribe: (() => void) | null = null;
  private eventListeners: Map<string, EventListener> = new Map();

  /**
   * Lifecycle: element inserted into DOM
   */
  connectedCallback(): void {
    try {
      // 1. Get app context from window (typed above)
      this.app = window.__ux3App as AppContext<Context>;
      if (!this.app) {
        throw new Error('AppContext not initialized. Call createAppContext first.');
      }

      // 2. Extract configuration from attributes or convention
      const fsmName = this.getAttribute('ux-fsm') || this.tagName.toLowerCase().replace(/^ux-/, '');
      const viewName = this.getAttribute('ux-view') || fsmName;
      const layoutName = this.getAttribute('ux-layout') || 'default';

      // 3. Load FSM and layout
      // Generated view names match the YAML key (e.g. 'news') but AppContextBuilder stores
      // machines under the suffixed key 'newsFSM'.  Try both to be forward-compatible.
      this.fsm = this.app.machines[fsmName] ?? this.app.machines[`${fsmName}FSM`];
      if (!this.fsm) {
        throw new Error(`FSM not found: '${fsmName}' or '${fsmName}FSM'. Available: ${Object.keys(this.app.machines).join(', ')}`);
      }

      this.layout = this.app.template(layoutName);
      if (!this.layout) {
        throw new Error(`Layout not found: ${layoutName}`);
      }

      // 4. Load templates for all FSM states (skip when subclass already provides them)
      if (this.templates.size === 0) {
        this.loadTemplates(viewName || fsmName);
      }

      // 5. Mount layout to shadow DOM
      this.attachShadow({ mode: 'open' });
      this.mountLayout();

      // 6. Render initial state
      this.currentState = this.fsm.getState();
      this.renderState(this.currentState);

      // run any side-effects for the starting state (e.g. service invokes)
      // `onFSMStateChange` ignores duplicate state values, so call the invoke
      // method directly to ensure initial actions are executed.
      this.handleStateInvoke(this.currentState).catch(err => {
        console.error('[ViewComponent] initial state invoke error', err);
      });

      // 7. Subscribe to FSM state changes
      this.unsubscribe = this.fsm.subscribe((state) => {
        this.onFSMStateChange(state);
      });

      // Emit telemetry
      this.emitTelemetry('view:mount', {
        view: viewName || fsmName,
        state: this.currentState,
      });
    } catch (error) {
      console.error('[ViewComponent] Connection failed:', error);
      this.showErrorState(error as Error);
    }
  }

  /**
   * Lifecycle: element removed from DOM
   */
  disconnectedCallback(): void {
    try {
      // Cleanup: unsubscribe from FSM
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }

      // Cleanup: remove event listeners
      this.removeEventListeners();

      // Emit telemetry
      this.emitTelemetry('view:unmount', {
        view: this.getAttribute('ux-view'),
      });
    } catch (error) {
      console.error('[ViewComponent] Disconnection error:', error);
    }
  }

  /**
   * Load templates for all FSM states
   */
  private loadTemplates(viewName: string): void {
    const fsmName = this.getAttribute('ux-fsm')!;
    const machine = this.app.machines[fsmName] ?? this.app.machines[`${fsmName}FSM`];
    // support both older and newer machine APIs
    type MaybeConfigArg = { getMachineConfig?: () => any; getStateConfig?: (arg?: unknown) => any };
    const cfgMachine = machine as MaybeConfigArg;
    const fsmConfig =
      typeof cfgMachine.getMachineConfig === 'function'
        ? cfgMachine.getMachineConfig()
        : cfgMachine.getStateConfig?.(undefined);

    if (!fsmConfig.states) {
      console.warn(`[ViewComponent] FSM has no states: ${fsmName}`);
      return;
    }

    for (const stateName of Object.keys(fsmConfig.states)) {
      const templateName = `${viewName}-${stateName}`;
      const template = this.app.template(templateName);
      if (template) {
        this.templates.set(stateName, template);
      } else {
        console.warn(
          `[ViewComponent] Template not found: ${templateName}`
        );
      }
    }
  }

  /**
   * Mount layout to shadow DOM
   */
  private mountLayout(): void {
    const shadow = this.shadowRoot!;

    // Create container with layout
    const layoutEl = document.createElement('div');
    layoutEl.id = 'ux-layout';
    layoutEl.innerHTML = this.layout;

    // Inject styles
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    shadow.appendChild(style);

    shadow.appendChild(layoutEl);
  }

  /**
   * Get CSS styles for this view
   */
  protected getStyles(): string {
    return `
      :host {
        display: contents;
      }
      
      #ux-layout {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      
      #ux-content {
        flex: 1;
        overflow: auto;
      }
      
      .ux-error {
        padding: 1rem;
        background: #fee;
        color: #c00;
        border: 1px solid #f00;
        border-radius: 4px;
      }
    `;
  }

  /**
   * FSM state changed - swap template and rebind
   */
  private onFSMStateChange(state: string): void {
    console.debug('[ViewComponent] onFSMStateChange', state);
    try {
      if (this.currentState !== state) {
        this.currentState = state;
        
        // Reflect state to attribute for CSS-driven visibility
        this.setAttribute('data-state', state);
        
        this.renderState(state);

        // execute any configured invoke for this state (service call, logic function, etc)
        this.handleStateInvoke(state).catch(err => {
          console.error('[ViewComponent] state invoke error', err);
        });

        this.emitTelemetry('fsm:state-change', {
          view: this.getAttribute('ux-view'),
          state,
        });
      }
    } catch (error) {
      console.error('[ViewComponent] State change error:', error);
      this.showErrorState(error as Error);
    }
  }

  /**
   * Render a specific FSM state
   */
  private renderState(state: string): void {
    const template = this.templates.get(state);
    if (!template) {
      console.warn(`[ViewComponent] No template for state: ${state}`);
      return;
    }

    const contentArea = this.shadowRoot?.querySelector('#ux-content');
    if (!contentArea) {
      console.warn('[ViewComponent] Content area not found');
      return;
    }

    // Remove old event listeners
    this.removeEventListeners();

    // Render template through app's render function to process Handlebars
    const renderedHtml = this.app.render ? this.app.render(template) : template;
    contentArea.innerHTML = renderedHtml;

    // Rebind event listeners
    this.setupEventListeners();

    // Rebind reactive effects
    this.setupReactiveEffects();
  }

  /**
   * Attempt to invoke configured action when entering a state.
   * Supports service adapter invocations or local functions.
   */
  private async handleStateInvoke(state: string): Promise<void> {
    console.debug('[ViewComponent] handleStateInvoke', state);
    try {
      // obtain raw FSM config
      const cfgMachine: any = this.fsm;
      const fsmConfig =
        typeof cfgMachine.getMachineConfig === 'function'
          ? cfgMachine.getMachineConfig()
          : cfgMachine.getStateConfig?.(undefined);
      const stateCfg = fsmConfig?.states?.[state];
      if (!stateCfg || !stateCfg.invoke) return;

      const inv: any = stateCfg.invoke;
      let result: any;

      if (inv.service) {
        const svc = this.app.services[inv.service];
        if (!svc) throw new Error(`Service not registered: ${inv.service}`);
        const method = inv.method || 'fetch';
        result = await svc[method](inv.input);
      } else if (inv.src) {
        if (typeof inv.src === 'function') {
          result = await inv.src(inv.input, this.fsm.getContext());
        } else if (typeof inv.src === 'string') {
          const fn = (window as any)[inv.src];
          if (typeof fn === 'function') {
            result = await fn(inv.input, this.fsm.getContext());
          } else {
            throw new Error(`Invoke source not found: ${inv.src}`);
          }
        }
      }

      if (result && typeof result === 'object') {
        this.fsm.setState(result);
      }

      this.fsm.send('SUCCESS');
    } catch (err) {
      this.fsm.send('ERROR');
      throw err;
    }
  }

  /**
   * Setup event delegation
   * Binds FSM transitions to element events
   */
  private setupEventListeners(): void {
    const contentArea = this.shadowRoot?.querySelector('#ux-content');
    if (!contentArea) return;

    // Find all elements with ux-on:* OR ux-event attributes
    // Note: CSS doesn't support wildcards in attribute selectors, so we query separately
    // and combine the results manually
    const allElements = new Set<Element>();
    
    // Get elements with ux-event attribute
    contentArea.querySelectorAll('[ux-event]').forEach((el) => allElements.add(el));
    
    // Get elements with ux-on:* attributes by walking the tree
    const walk = (node: Element) => {
      if (node.attributes) {
        for (const attr of node.attributes) {
          if (attr.name.startsWith('ux-on:')) {
            allElements.add(node);
            break;
          }
        }
      }
      for (const child of node.children) {
        walk(child);
      }
    };
    walk(contentArea);
    
    allElements.forEach((element) => {
      // 1. Handle ux-event directive: "click:SUBMIT"
      const uxEvent = element.getAttribute('ux-event');
      if (uxEvent) {
        const [eventName, action] = uxEvent.split(':');
        if (eventName && action) {
          const listener = (event: Event) => {
            if (element.tagName === 'FORM' && event.type === 'submit') {
              event.preventDefault();
            }
            const payload = this.extractPayload(element as HTMLElement, event);
            this.fsm.send({ type: action, payload });
          };
          element.addEventListener(eventName, listener);
          this.eventListeners.set(`${element.tagName}:${eventName}:${action}`, listener);
        }
      }

      // 2. Handle legacy ux-on:* attributes
      for (const attr of element.attributes) {
        if (attr.name.startsWith('ux-on:')) {
          const eventName = attr.name.slice(6); // "ux-on:click" → "click"
          const action = attr.value; // e.g., "SUBMIT"

          const listener = (event: Event) => {
            const payload = this.extractPayload(element as HTMLElement, event);
            this.fsm.send({ type: action, payload });
          };

          element.addEventListener(eventName, listener);
          this.eventListeners.set(`${element.id || element.tagName}:${eventName}`, listener);
        }
      }
    });

    // Also support standard form submission and button clicks
    this.setupFormBindings(contentArea);
  }

  /**
   * Setup form and button auto-bindings
   */
  private setupFormBindings(contentArea: Element): void {
    const forms = contentArea.querySelectorAll('form[ux-on\\:submit]');
    forms.forEach((form) => {
      const action = form.getAttribute('ux-on:submit');
      if (!action) return;

      const listener = (event: Event) => {
        event.preventDefault();
        const formData = new FormData(form as HTMLFormElement);
        const payload = Object.fromEntries(formData);
        this.fsm.send({ type: action, payload });
      };

      form.addEventListener('submit', listener);
      this.eventListeners.set(`form:submit`, listener);
    });
  }

  /**
   * Setup reactive effects
   * Watches FSM context and updates DOM on changes
   */
  private setupReactiveEffects(): void {
    const contentArea = this.shadowRoot?.querySelector('#ux-content');
    if (!contentArea) return;

    // Simple reactive binding: {{signal}} in templates
    // This would be enhanced with a full reactivity system in production
    const context = this.fsm.getContext();

    for (const [key, value] of Object.entries(context)) {
      const selector = `[data-bind="${key}"]`;
      const elements = contentArea.querySelectorAll(selector);

      elements.forEach((el) => {
        if (el instanceof HTMLElement) {
          if (el instanceof HTMLInputElement) {
            el.value = String(value);
          } else {
            el.textContent = String(value);
          }
        }
      });
    }
  }

  /**
   * Extract payload from form or element
   */
  private extractPayload(
    element: HTMLElement,
    event: Event
  ): Record<string, unknown> {
    if (element instanceof HTMLFormElement) {
      return Object.fromEntries(new FormData(element));
    }

    if (element instanceof HTMLInputElement) {
      return { value: element.value };
    }

    return {};
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    const contentArea = this.shadowRoot?.querySelector('#ux-content');
    if (!contentArea) return;

    // Would need to keep references to remove properly
    // For now, just clear the map
    this.eventListeners.clear();
  }

  /**
   * Show error state
   */
  private showErrorState(error: Error): void {
    const contentArea = this.shadowRoot?.querySelector('#ux-content');
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="ux-error">
        <h3>Error</h3>
        <p>${error.message}</p>
      </div>
    `;

    this.emitTelemetry('view:error', {
      view: this.getAttribute('ux-view'),
      error: error.message,
    });
  }

  /**
   * Emit telemetry event
   */
  protected emitTelemetry(eventType: string, data: unknown): void {
    if (window.__ux3Telemetry) {
      window.__ux3Telemetry(eventType, data);
    }
  }

  /**
   * Helper: get FSM context with type safety
   */
  getContext(): Readonly<Context> {
    return this.fsm.getContext();
  }

  /**
   * Helper: send FSM event
   */
  sendFSMEvent(action: string, payload?: unknown): void {
    this.fsm.send({ type: action, payload });
  }

  /**
   * Stamps a consumer-provided template with data
   * @param slotName The name of the slot containing the template
   * @param data The data context for interpolation
   */
  protected stampSlotTemplate(slotName: string, data: unknown): DocumentFragment | null {
    const template = this.querySelector(`template[slot="${slotName}"]`) as HTMLTemplateElement;
    if (!template) {
      console.warn(`[ViewComponent] No template found for slot: ${slotName}`);
      return null;
    }
    return stampTemplate(template, data);
  }

  /**
   * Observes a slot for assignment changes
   */
  protected observeViewSlot(slotName: string | null, callback: (nodes: Node[]) => void): () => void {
    return observeSlot(this, slotName, callback);
  }

  /**
   * Gets assigned elements for a slot
   */
  protected getAssignedViewElements(slotName: string | null): Element[] {
    const slotSelector = slotName ? `slot[name="${slotName}"]` : 'slot:not([name])';
    const slot = this.shadowRoot?.querySelector(slotSelector) as HTMLSlotElement;
    if (!slot) return [];
    return getAssignedElements(slot);
  }
}
