/**
 * ViewComponent - Base class for FSM-driven views
 * Handles layout mounting, FSM binding, template swapping, and event delegation
 */

import { StateMachine } from '../fsm/state-machine.js';
import type { AppContext } from './app.js';
import { StructuredLogger } from '../logger/logger.js';
import { LifecycleComponent } from './lifecycle-component.js';

function resolveDotPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: any, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

function applyResultMap(result: any, map: Record<string, string> | undefined): Record<string, unknown> {
  if (!map || typeof result !== 'object' || result === null) return result ?? {};
  const mapped: Record<string, unknown> = {};
  for (const [contextKey, resultPath] of Object.entries(map)) {
    mapped[contextKey] = resolveDotPath(result, resultPath);
  }
  return mapped;
}

// expose global for runtime
declare global {
  interface Window {
    __ux3App?: AppContext;
    __ux3Telemetry?: (event: string, data: unknown) => void;
  }
}
import { stampTemplate, TemplateContext } from './template-stamp.js';
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

/**
 * ViewComponent - Base Web Component for FSM-driven views
 * Each view has:
 * - A layout (shared HTML structure)
 * - An FSM (state machine managing transitions)
 * - Templates (HTML for each FSM state)
 * - Bindings (event listeners, reactive updates, etc.)
 */
export abstract class ViewComponent<Context extends Record<string, unknown> = Record<string, unknown>> extends LifecycleComponent {
  protected app!: AppContext<Context>;
  protected fsm!: StateMachine<Context>;
  protected layout: string = '';
  protected state: string = '';
  protected templates: Map<string, string> = new Map();
  protected bindings: TemplateBindings = {
    events: [],
    reactive: [],
    i18n: [],
    widgets: [],
  };

  private unsubscribe: (() => void) | null = null;
  private onLocaleChange: (() => void) | null = null;
  private templateEventDisposers: Array<() => void> = [];
  private logger = new StructuredLogger('ViewComponent');
  private maxRetries = 10;
  private retryDelay = 50;

  /**
   * Lifecycle: element inserted into DOM
   */
  protected onConnected(): void {
    if (!window.__ux3App && this.maxRetries > 0) {
      this.maxRetries--;
      setTimeout(() => this.onConnected(), this.retryDelay);
      return;
    }
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
      // machines under the key 'news' or 'newsFSM' depending on older vs newer config.
      // BUG-5: allow fallback to name + 'FSM' when the bare name is absent.
      let machine = this.app.machines[fsmName];
      if (!machine) {
        machine = this.app.machines[`${fsmName}FSM`];
        if (machine) {
          this.logger.debug('fsm.fallback', { fsmName, fallback: `${fsmName}FSM` });
        }
      }
      this.fsm = machine as any;
      if (!this.fsm) {
        throw new Error(`FSM not found: '${fsmName}'. Available: ${Object.keys(this.app.machines).join(', ')}`);
      }

      // Prefer app-level layout templates, but keep the generated in-class
      // layout fallback so examples using only `ux/layout/_.html` still render.
      const runtimeLayout = this.app.template(layoutName);
      if (runtimeLayout) {
        this.layout = runtimeLayout;
      } else if (!this.layout) {
        throw new Error(`Layout not found: ${layoutName}`);
      }

      // 4. Load templates for all FSM states (skip when subclass already provides them)
      if (this.templates.size === 0) {
        this.loadTemplates(viewName || fsmName);
      }

      // 5. Mount layout
      this.mountLayout();

      // Inject route params into FSM context (data-param-* attributes from navigation handler)
      const routeParams: Record<string, string> = {};
      for (const attr of this.attributes) {
        if (attr.name.startsWith('data-param-')) {
          const paramName = attr.name.replace('data-param-', '');
          routeParams[paramName] = attr.value;
        }
      }
      if (Object.keys(routeParams).length > 0) {
        Object.assign(this.fsm.getContext(), { params: routeParams });
      }

      // 6. Render initial state
      this.state = this.fsm.getState();
      this.renderState(this.state);

      // run any side-effects for the starting state (e.g. service invokes)
      // `onFSMStateChange` ignores duplicate state values, so call the invoke
      // method directly to ensure initial actions are executed.
      this.handleStateInvoke(this.state).catch(err => {
        this.logger.error('initial.invoke.error', { error: String(err) });
      });

      // 7. Subscribe to FSM state changes
      this.unsubscribe = this.fsm.subscribe((state) => {
        this.onFSMStateChange(state);
      });

      // 8. Re-render on locale change so i18n-interpolated templates update
      this.onLocaleChange = () => this.renderState(this.state);
      window.addEventListener('languagechange', this.onLocaleChange);

      // Emit telemetry
      this.emitTelemetry('view:mount', {
        view: viewName || fsmName,
        state: this.state,
      });
    } catch (error) {
      this.logger.error('connection.failed', { error: String(error) });
      this.showErrorState(error as Error);
    }
  }

  /**
   * Lifecycle: element removed from DOM
   */
  protected onDisconnected(): void {
    try {
      // Cleanup: unsubscribe from FSM
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }

      // Cleanup: locale change listener
      if (this.onLocaleChange) {
        window.removeEventListener('languagechange', this.onLocaleChange);
        this.onLocaleChange = null;
      }

      // Cleanup: remove event listeners
      this.removeEventListeners();

      // Emit telemetry
      this.emitTelemetry('view:unmount', {
        view: this.getAttribute('ux-view'),
      });
    } catch (error) {
      this.logger.error('disconnection.error', { error: String(error) });
    }
  }

  /**
   * Load templates for all FSM states
   */
  private loadTemplates(viewName: string): void {
    const fsmName = this.getAttribute('ux-fsm')!;
    // same fallback logic as connectedCallback
    let machine = this.app.machines[fsmName];
    if (!machine) {
      machine = this.app.machines[`${fsmName}FSM`];
    }
    // support both older and newer machine APIs
    type MaybeConfigArg = { getMachineConfig?: () => any; getStateConfig?: (arg?: unknown) => any };
    const cfgMachine = machine as MaybeConfigArg;
    const fsmConfig =
      typeof cfgMachine.getMachineConfig === 'function'
        ? cfgMachine.getMachineConfig()
        : cfgMachine.getStateConfig?.(undefined);

    if (!fsmConfig.states) {
      this.logger.debug('fsm.no_states', { fsmName });
      return;
    }

    for (const stateName of Object.keys(fsmConfig.states)) {
      const templateName = `${viewName}-${stateName}`;
      const template = this.app.template(templateName);
      if (template) {
        this.templates.set(stateName, template);
      } else {
        this.logger.warn('template.not_found', { templateName });
      }
    }
  }

  /**
   * Mount layout to shadow DOM.
   *
   * When the view element is already contained within a light DOM
   * #ux-content that has the full layout rendered by the server, use a
   * minimal wrapper (<main id="ux-content">) to avoid duplicating chrome
   * (topbar, header, footer, etc.) inside the shadow root.
   */
  protected mountLayout(): void {
    const el = this;

    const lightContentEl = typeof document !== 'undefined'
      ? document.getElementById('ux-content')
      : null;
    const alreadyRendered = lightContentEl && lightContentEl.contains(this);

    const renderedLayout = alreadyRendered
      ? '<main id="ux-view-content" role="main">{{{content}}}</main>'
      : (this.app?.render?.(this.layout) || this.layout);

    const layoutEl = document.createElement('div');
    layoutEl.id = 'ux-layout';
    layoutEl.innerHTML = renderedLayout;

    this.normalizeLayoutMountPoint(layoutEl);

    el.appendChild(layoutEl);
    this.applyMappedStyles(el);
  }

  private applyMappedStyles(root: ParentNode): void {
    const styleMap = (this.app as { styles?: Record<string, string> } | undefined)?.styles;
    if (!styleMap) {
      return;
    }

    root.querySelectorAll('[ux-style], [data-style]').forEach((el) => {
      const key = el.getAttribute('ux-style') || el.getAttribute('data-style') || '';
      const mapped = styleMap[key];
      if (!mapped || typeof mapped !== 'string') {
        return;
      }

      const node = el as HTMLElement;
      const existing = node.className.split(/\s+/).filter(Boolean);
      const incoming = mapped.split(/\s+/).filter(Boolean);
      node.className = Array.from(new Set([...existing, ...incoming])).join(' ');
    });
  }

  /**
   * Normalize layout mount region.
   *
   * Preferred runtime contract is `#ux-content`. For ergonomics, allow
   * `<ux-view />` in layout templates as an alias and map it to
   * `<ux-content id="ux-content" role="main"></ux-content>`.
   */
  private normalizeLayoutMountPoint(layoutEl: HTMLElement): void {
    if (layoutEl.querySelector('#ux-content, #ux-view-content')) {
      return;
    }

    const viewSlot = layoutEl.querySelector('ux-view');
    if (!viewSlot) {
      return;
    }

    const mount = document.createElement('ux-content');
    mount.id = 'ux-content';
    mount.setAttribute('role', viewSlot.getAttribute('role') || 'main');

    // Preserve useful author-defined attributes (for style hooks, data attrs, etc.)
    for (const attr of Array.from(viewSlot.attributes)) {
      if (attr.name === 'id' || attr.name === 'role') continue;
      mount.setAttribute(attr.name, attr.value);
    }

    viewSlot.replaceWith(mount);
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
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #111827;
      }

      :host(.ux-view-entering) #ux-layout {
        opacity: 0;
        transform: translateY(6px);
        transition: none;
      }

      :host(:not(.ux-view-entering)) #ux-layout {
        opacity: 1;
        transform: translateY(0);
        transition: opacity 180ms ease-out, transform 180ms ease-out;
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
      const stateChanged = this.state !== state;
      this.state = state;
      
      // Reflect state to attribute for CSS-driven visibility
      this.setAttribute('data-state', state);
      
      if (stateChanged) {
        this.renderState(state);

        // execute any configured invoke for this state (service call, logic function, etc)
        this.handleStateInvoke(state).catch(err => {
          this.logger.error('state.invoke.error', { state, error: String(err) });
        });
      }

      this.applyShowHideBindings();

      this.emitTelemetry('fsm:state-change', {
        view: this.getAttribute('ux-view'),
        state,
      });
    } catch (error) {
      this.logger.error('state.change.error', { state, error: String(error) });
      this.showErrorState(error as Error);
    }
  }

  /**
   * Render a specific FSM state
   */
  private renderState(state: string): void {
    const template = this.templates.get(state);
    if (!template) {
      this.logger.warn('render.no_template', { state });
      return;
    }

    const contentArea = this.querySelector('#ux-content, #ux-view-content');
    if (!contentArea) {
      this.logger.warn('render.no_content_area', {});
      return;
    }

    // Remove old event listeners
    this.removeEventListeners();

    // Render template through app's render function to process Handlebars
    const ctx = this.fsm?.getContext ? this.fsm.getContext() : {};
    const renderedHtml = this.app.render
      ? this.app.render(template, { ctx })
      : template;
    if (typeof renderedHtml === 'string' && renderedHtml.includes('{{ i18n.')) {
      if (typeof document !== 'undefined') {
        console.warn('[ViewComponent] HBS tags unresolved in renderState — i18n may not be loaded', { view: this.getAttribute('ux-view'), sample: renderedHtml.substring(0, 80) });
      }
    }
    contentArea.innerHTML = renderedHtml;
    this.applyMappedStyles(contentArea);

    // Rebind event listeners
    this.setupEventListeners();

    // Rebind reactive effects
    this.setupReactiveEffects();

    // Apply context-driven visibility
    this.applyShowHideBindings();
  }

  /**
   * Attempt to invoke configured action when entering a state.
   * Supports service adapter invocations or local functions.
   *
   * Auto-manages context.loading (true→false lifecycle) and context.error
   * (error message on failure, null on success).
   */
  private async handleStateInvoke(state: string): Promise<void> {
    try {
      const ctor = (this as any).constructor;
      const classConfig = ctor.FSM_CONFIG ?? ctor.fsmConfig;
      let fsmConfig = classConfig;
      if (!fsmConfig?.states?.[state]?.invoke) {
        const cfgMachine: any = this.fsm;
        fsmConfig =
          typeof cfgMachine.getMachineConfig === 'function'
            ? cfgMachine.getMachineConfig()
            : cfgMachine.getStateConfig?.(undefined);
      }
      const stateCfg = fsmConfig?.states?.[state];
      if (!stateCfg || !stateCfg.invoke) return;

      (this.fsm as any).setState?.({ loading: true });
      try {
      const inv: any = stateCfg.invoke;
      let result: any;

      if (inv.service) {
        const svc = this.app.services[inv.service];
        if (!svc) throw new Error(`Service not registered: ${inv.service}`);
        const method = inv.method || 'fetch';
        result = await (svc as any)[method](inv.input);
      } else if (inv.src) {
        if (typeof inv.src === 'function') {
          result = await inv.src(inv.input, this.getContext());
        } else if (typeof inv.src === 'string') {
          const fn = (window as any)[inv.src];
          if (typeof fn === 'function') {
            result = await fn(inv.input, this.getContext());
          } else {
            throw new Error(`Invoke source not found: ${inv.src}`);
          }
        }
      }

      const mapped = applyResultMap(result, inv.map);
      if (mapped && typeof mapped === 'object') {
        this.fsm.setState(mapped as any);
      }

      (this.fsm as any).setState?.({ error: null });

      if (inv.onDone && typeof inv.onDone === 'string') {
        this.fsm.transitionTo(inv.onDone);
      }
      } finally {
        (this.fsm as any).setState?.({ loading: false });
      }
    } catch (err) {
      (this.fsm as any).setState?.({ error: String(err), loading: false });
      this.fsm.send('ERROR');
      throw err;
    }
  }

  /**
   * Setup event delegation
   * Binds FSM transitions to element events via the ux-event directive.
   * Format: ux-event="eventName:FSM_ACTION"  (explicit)
   *         ux-event="eventName"              (action inferred from element)
   * Example: ux-event="click:SUBMIT", ux-event="submit:SAVE"
   *          ux-event="click" on Save button → action derived as "SAVE"
   */
  private setupEventListeners(): void {
    const contentArea = this.querySelector('#ux-content, #ux-view-content');
    if (!contentArea) return;

    const elements = contentArea.querySelectorAll('[ux-event]');
    
    elements.forEach((element) => {
      const uxEvent = element.getAttribute('ux-event');
      if (!uxEvent) return;
      const parsed = this.parseUxEvent(element as HTMLElement, uxEvent);
      if (!parsed) return;

      const listener = (event: Event) => {
        if (element.tagName === 'FORM' && event.type === 'submit') {
          event.preventDefault();
        }
        const payload = this.extractPayload(element as HTMLElement, event);
        this.fsm.send({ type: parsed.action, payload, fromDOM: true, sourceElement: element as HTMLElement });
      };
      this.templateEventDisposers.push(this.listen(element, parsed.event, listener));
    });

    const eventHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.action) {
        const { action, ...rest } = detail;
        this.fsm.send({ type: action, payload: detail.payload || rest || {}, fromDOM: true });
      }
    };
    this.templateEventDisposers.push(
      this.listen(contentArea, 'ux:event', eventHandler)
    );

    const changeHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target) return;
      const uxEvent = target.getAttribute('ux-event');
      if (!uxEvent) return;
      const parsed = this.parseUxEvent(target, uxEvent);
      if (!parsed || parsed.event !== 'change') return;
      const detail = (event as CustomEvent).detail;
      this.fsm.send({ type: parsed.action, payload: detail || {}, fromDOM: true });
    };
    this.templateEventDisposers.push(
      this.listen(contentArea, 'ux:change', changeHandler)
    );
  }

  /**
   * Parse ux-event attribute into { event, action }.
   * With colon: "click:SAVE" → { event: "click", action: "SAVE" }
   * Without colon: "click" on <ux-button>Save</ux-button> → { event: "click", action: "SAVE" }
   *                "change" on <ux-input name="query"> → { event: "change", action: "CHANGE_QUERY" }
   */
  private parseUxEvent(element: HTMLElement, uxEvent: string): { event: string; action: string } | null {
    const colonIdx = uxEvent.indexOf(':');
    const eventName = colonIdx >= 0 ? uxEvent.slice(0, colonIdx).trim() : uxEvent.trim();
    const explicitAction = colonIdx >= 0 ? uxEvent.slice(colonIdx + 1).trim() : '';

    if (!eventName) return null;

    const action = explicitAction || this.deriveActionName(element, eventName);
    if (!action) return null;

    return { event: eventName, action };
  }

  private deriveActionName(element: HTMLElement, domEvent: string): string {
    const tag = element.tagName;
    const text = element.textContent?.trim() || '';

    if (tag === 'FORM' && domEvent === 'submit') {
      const submitBtn = element.querySelector('[type="submit"], ux-button[type="submit"]');
      if (submitBtn) {
        const btnText = submitBtn.textContent?.trim();
        if (btnText) return btnText.replace(/\s+/g, '_').toUpperCase();
      }
      return 'SUBMIT';
    }

    if (text && text.length <= 40 && !text.includes('<')) {
      return text.replace(/\s+/g, '_').toUpperCase();
    }

    const name = element.getAttribute('name');
    if (name) {
      const prefix = domEvent.toUpperCase();
      return `${prefix}_${name.replace(/\s+/g, '_').toUpperCase()}`;
    }

    const prefix = domEvent.toUpperCase();
    const tagName = tag.replace(/^UX-/, '');
    return tagName ? `${prefix}_${tagName}` : prefix;
  }

  /**
   * Setup reactive effects
   * Watches FSM context and updates DOM on changes
   */
  private setupReactiveEffects(): void {
    const contentArea = this.querySelector('#ux-content, #ux-view-content');
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
   * Apply ux-show / ux-hide bindings based on current FSM context.
   * Evaluates simple dot-path expressions like "context.loading" or
   * "context.results.length" and toggles element visibility.
   */
  private applyShowHideBindings(): void {
    const contentArea = this.querySelector('#ux-content, #ux-view-content');
    if (!contentArea) return;

    const ctx = this.fsm?.getContext?.() as Record<string, unknown> ?? {};

    const evalExpr = (expr: string): boolean => {
      const path = expr.startsWith('context.') ? expr.slice(8) : expr;
      const val = path.split('.').reduce<any>((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), ctx);
      return !!val;
    };

    contentArea.querySelectorAll('[ux-show]').forEach((el: Element) => {
      const expr = el.getAttribute('ux-show')!;
      (el as HTMLElement).style.display = evalExpr(expr) ? '' : 'none';
    });

    contentArea.querySelectorAll('[ux-hide]').forEach((el: Element) => {
      const expr = el.getAttribute('ux-hide')!;
      (el as HTMLElement).style.display = evalExpr(expr) ? 'none' : '';
    });
  }

  /**
   * Extract payload from form or element
   */
  private extractPayload(
    element: HTMLElement,
    event: Event
  ): Record<string, unknown> {
    const attrPayload = this.parseEventValueAttribute(element.getAttribute('ux-event-value'));

    if (element instanceof HTMLFormElement) {
      return {
        ...attrPayload,
        ...Object.fromEntries(new FormData(element)),
      };
    }

    if (element instanceof HTMLInputElement) {
      return {
        ...attrPayload,
        value: element.value,
      };
    }

    if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
      return {
        ...attrPayload,
        value: element.value,
      };
    }

    const value = (element as any).value;
    if (value !== undefined && value !== null && typeof value !== 'object') {
      const name = element.getAttribute('name');
      if (name) {
        return { ...attrPayload, [name]: value };
      }
      return { ...attrPayload, value };
    }

    return attrPayload;
  }

  private parseEventValueAttribute(value: string | null): Record<string, unknown> {
    if (!value) {
      return {};
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }

    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? parsed as Record<string, unknown>
          : { value: parsed };
      } catch {
        // Fall through to key=value parsing.
      }
    }

    if (trimmed.includes('=')) {
      const payload: Record<string, unknown> = {};
      for (const pair of trimmed.split(',')) {
        const [rawKey, ...rawValue] = pair.split('=');
        const key = rawKey?.trim();
        if (!key) {
          continue;
        }
        payload[key] = rawValue.join('=').trim();
      }
      return payload;
    }

    return { value: trimmed };
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    for (const dispose of this.templateEventDisposers) {
      dispose();
    }
    this.templateEventDisposers = [];
  }

  /**
   * Show error state
   */
  private showErrorState(error: Error): void {
    const contentArea = this.querySelector('#ux-content, #ux-view-content');
    if (!contentArea) return;

    contentArea.innerHTML = '';
    const errDiv = document.createElement('div');
    errDiv.className = 'ux-error';
    const pre = document.createElement('pre');
    pre.textContent = error.message;
    errDiv.appendChild(pre);
    contentArea.appendChild(errDiv);

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
  sendFSMEvent(action: string, payload?: any): void {
    this.fsm.send({ type: action, payload });
  }

  /**
   * Stamps a consumer-provided template with data
   * @param slotName The name of the slot containing the template
   * @param data The data context for interpolation
   */
  protected stampSlotTemplate(slotName: string, data: TemplateContext): DocumentFragment | null {
    const template = this.querySelector(`template[slot="${slotName}"]`) as HTMLTemplateElement;
    if (!template) {
      this.logger.warn('slot.template.not_found', { slotName });
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
    const slot = this.querySelector(slotSelector) as HTMLSlotElement;
    if (!slot) return [];
    return getAssignedElements(slot);
  }
}
