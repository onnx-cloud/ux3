/**
 * ViewComponent - Base class for FSM-driven views
 * Handles layout mounting, FSM binding, template swapping, and event delegation
 */

import { StateMachine } from '../fsm/state-machine.js';
import type { AppContext } from './app.js';
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
export abstract class ViewComponent<Context extends Record<string, any> = any> extends HTMLElement {
  protected app!: AppContext;
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
      // 1. Get app context from window or parent
      this.app = (window as any).__ux3App;
      if (!this.app) {
        throw new Error('AppContext not initialized. Call createAppContext first.');
      }

      // 2. Extract configuration from attributes or convention
      const fsmName = this.getAttribute('ux-fsm') || this.tagName.toLowerCase().replace(/^ux-/, '');
      const viewName = this.getAttribute('ux-view') || fsmName;
      const layoutName = this.getAttribute('ux-layout') || 'default';

      // 3. Load FSM and layout
      this.fsm = this.app.machines[fsmName];
      if (!this.fsm) {
        throw new Error(`FSM not found: ${fsmName}`);
      }

      this.layout = this.app.template(layoutName);
      if (!this.layout) {
        throw new Error(`Layout not found: ${layoutName}`);
      }

      // 4. Load templates for all FSM states
      this.loadTemplates(viewName || fsmName);

      // 5. Mount layout to shadow DOM
      this.attachShadow({ mode: 'open' });
      this.mountLayout();

      // 6. Render initial state
      this.currentState = this.fsm.getState();
      this.renderState(this.currentState);

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
    const fsmConfig = this.app.machines[fsmName].getStateConfig(undefined);

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
    try {
      if (this.currentState !== state) {
        this.currentState = state;
        
        // Reflect state to attribute for CSS-driven visibility
        this.setAttribute('data-state', state);
        
        this.renderState(state);

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

    // Render new template
    contentArea.innerHTML = template;

    // Rebind event listeners
    this.setupEventListeners();

    // Rebind reactive effects
    this.setupReactiveEffects();
  }

  /**
   * Setup event delegation
   * Binds FSM transitions to element events
   */
  private setupEventListeners(): void {
    const contentArea = this.shadowRoot?.querySelector('#ux-content');
    if (!contentArea) return;

    // Find all elements with ux-on:* OR ux-event attributes
    const elements = contentArea.querySelectorAll('[ux-on\\:*], [ux-event]');
    elements.forEach((element) => {
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
  ): Record<string, any> {
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
  protected emitTelemetry(eventType: string, data: any): void {
    if ((window as any).__ux3Telemetry) {
      (window as any).__ux3Telemetry(eventType, data);
    }
  }

  /**
   * Helper: get FSM context with type safety
   */
  getContext(): Readonly<Context> {
    return this.fsm.getContext() as Readonly<Context>;
  }

  /**
   * Helper: send FSM event
   */
  sendFSMEvent(action: string, payload?: any): void {
    this.fsm.send({ type: action, payload });
  }

  /**
   * Stamps a consumer-provided template with data
   * @param slotName The name of the slot containing the template
   * @param data The data context for interpolation
   */
  protected stampSlotTemplate(slotName: string, data: any): DocumentFragment | null {
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
