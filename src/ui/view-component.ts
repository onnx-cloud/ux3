/**
 * ViewComponent - Base class for FSM-driven views
 * Handles layout mounting, FSM binding, template swapping, and event delegation
 */

import { StateMachine } from '../fsm/state-machine.js';
import type { AppContext } from './app.js';
import { StructuredLogger } from '../logger/logger.js';
import { LifecycleComponent } from './lifecycle-component.js';

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

      // 5. Mount layout to shadow DOM
      this.attachShadow({ mode: 'open' });
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
  private mountLayout(): void {
    const shadow = this.shadowRoot!;

    const layoutEl = document.createElement('div');
    layoutEl.id = 'ux-layout';
    
    const lightContentEl = typeof document !== 'undefined'
      ? document.getElementById('ux-content')
      : null;
    const alreadyRendered = lightContentEl && lightContentEl.contains(this);

    const renderedLayout = alreadyRendered
      ? '<main id="ux-content" role="main">{{{content}}}</main>'
      : (this.app?.render?.(this.layout) || this.layout);

    layoutEl.innerHTML = renderedLayout;

    this.normalizeLayoutMountPoint(layoutEl);

    // Inject styles
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    shadow.appendChild(style);
    this.syncGlobalStylesIntoShadow(shadow);

    shadow.appendChild(layoutEl);
    this.applyMappedStyles(shadow);

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.syncGlobalStylesIntoShadow(shadow));
    }
    setTimeout(() => this.syncGlobalStylesIntoShadow(shadow), 120);
  }

  private syncGlobalStylesIntoShadow(shadow: ShadowRoot): void {
    if (typeof document === 'undefined' || !document.head) {
      return;
    }

    const existingLinks = new Set(
      Array.from(shadow.querySelectorAll('link[rel="stylesheet"]'))
        .map((el) => el.getAttribute('href'))
        .filter((href): href is string => Boolean(href))
    );

    for (const link of Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'))) {
      const href = link.getAttribute('href');
      if (!href || existingLinks.has(href)) {
        continue;
      }
      shadow.appendChild(link.cloneNode(true));
      existingLinks.add(href);
    }

    const headStyles = Array.from(document.head.querySelectorAll('style'));
    for (const [index, style] of headStyles.entries()) {
      const key = style.getAttribute('data-ux3-shadow-key') || `head-style-${index}`;
      const existing = shadow.querySelector(`style[data-ux3-shadow-key="${key}"]`) as HTMLStyleElement | null;
      if (existing) {
        existing.textContent = style.textContent;
      } else {
        const clone = style.cloneNode(true) as HTMLStyleElement;
        clone.setAttribute('data-ux3-shadow-key', key);
        shadow.appendChild(clone);
      }
    }
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

    this.reflectClassesToLightDom(root);
  }

  private gatheredClassSet: Set<string> | null = null;

  private reflectClassesToLightDom(root: ParentNode): void {
    if (typeof document === 'undefined') return;
    const all = new Set(this.gatheredClassSet ?? []);
    const elts = root.querySelectorAll('[class]');
    for (let i = 0; i < elts.length; i++) {
      for (const c of (elts[i] as HTMLElement).className.split(/\s+/)) {
        if (c) all.add(c);
      }
    }
    this.gatheredClassSet = all;
    // TODO: what is this ugly mess - not idiomatic, causes performance issues if there are many classes.  
    // Need a more robust solution for sharing dynamic styles between shadow and light DOM>>
    let collector = document.getElementById('ux-class-collector');
    if (!collector) {
      collector = document.createElement('div');
      collector.id = 'ux-class-collector';
      collector.setAttribute('aria-hidden', 'true');
      collector.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;visibility:hidden;pointer-events:none;';
      document.body.appendChild(collector);
    }
    collector.className = Array.from(all).join(' ');
    // << end of ugly mess
    const tw = (window as any).tailwind;
    if (tw && typeof tw.refresh === 'function') {
      try { tw.refresh(); } catch { /* noop */ }
      setTimeout(() => this.syncGlobalStylesIntoShadow(this.shadowRoot!), 0);
    }
  }

  /**
   * Normalize layout mount region.
   *
   * Preferred runtime contract is `#ux-content`. For ergonomics, allow
   * `<ux-view />` in layout templates as an alias and map it to
   * `<ux-content id="ux-content" role="main"></ux-content>`.
   */
  private normalizeLayoutMountPoint(layoutEl: HTMLElement): void {
    if (layoutEl.querySelector('#ux-content')) {
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
      
      // Always re-render on any FSM transition – context may have changed
      this.renderState(state);

      // execute any configured invoke for this state (service call, logic function, etc)
      this.handleStateInvoke(state).catch(err => {
        this.logger.error('state.invoke.error', { state, error: String(err) });
      });

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

    const contentArea = this.shadowRoot?.querySelector('#ux-content');
    if (!contentArea) {
      this.logger.warn('render.no_content_area', {});
      return;
    }

    // Remove old event listeners
    this.removeEventListeners();

    // Render template through app's render function to process Handlebars
    const renderedHtml = this.app.render ? this.app.render(template) : template;
    contentArea.innerHTML = renderedHtml;
    this.applyMappedStyles(contentArea);

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
        result = await (svc as any)[method](inv.input);
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
   * Binds FSM transitions to element events via the ux-event directive.
   * Format: ux-event="eventName:FSM_ACTION"
   * Example: ux-event="click:SUBMIT", ux-event="submit:SAVE"
   */
  private setupEventListeners(): void {
    const contentArea = this.shadowRoot?.querySelector('#ux-content');
    if (!contentArea) return;

    // Query only [ux-event] — the legacy ux-on:* syntax has been removed.
    const elements = contentArea.querySelectorAll('[ux-event]');
    
    elements.forEach((element) => {
      const uxEvent = element.getAttribute('ux-event');
      if (!uxEvent) return;
      const colonIdx = uxEvent.indexOf(':');
      if (colonIdx < 0) return;
      const eventName = uxEvent.slice(0, colonIdx);
      const action = uxEvent.slice(colonIdx + 1);
      if (!eventName || !action) return;

      const listener = (event: Event) => {
        if (element.tagName === 'FORM' && event.type === 'submit') {
          event.preventDefault();
        }
        const payload = this.extractPayload(element as HTMLElement, event);
        this.fsm.send({ type: action, payload });
      };
      this.templateEventDisposers.push(this.listen(element, eventName, listener));
    });

    const eventHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.action) {
        this.fsm.send({ type: detail.action, payload: detail.payload || {} });
      }
    };
    this.templateEventDisposers.push(
      this.listen(contentArea, 'ux:event', eventHandler)
    );

    // Listen for ux:change from widgets (pass through to FSM if ux-event is set)
    const changeHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target) return;
      const uxEvent = target.getAttribute('ux-event');
      if (!uxEvent) return;
      const colonIdx = uxEvent.indexOf(':');
      if (colonIdx < 0) return;
      const eventName = uxEvent.slice(0, colonIdx);
      if (eventName !== 'change') return;
      const action = uxEvent.slice(colonIdx + 1);
      if (!action) return;
      const detail = (event as CustomEvent).detail;
      this.fsm.send({ type: action, payload: detail || {} });
    };
    this.templateEventDisposers.push(
      this.listen(contentArea, 'ux:change', changeHandler)
    );
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
    const contentArea = this.shadowRoot?.querySelector('#ux-content');
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
    const slot = this.shadowRoot?.querySelector(slotSelector) as HTMLSlotElement;
    if (!slot) return [];
    return getAssignedElements(slot);
  }
}
