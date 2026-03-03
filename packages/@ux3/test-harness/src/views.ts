/**
 * ViewComponent Testing Utilities
 * Helpers for testing FSM-driven views
 */

/**
 * Mock AppContext for view testing
 */
export class MockAppContext {
  machines: Record<string, any> = {};
  services: Record<string, any> = {};
  hooks: any;
  templates: Map<string, string> = new Map();

  constructor() {
    this.hooks = {
      on: () => {},
      execute: () => {},
      off: () => {},
      clear: () => {},
    };
  }

  /**
   * Register a template
   */
  registerTemplate(name: string, html: string): this {
    this.templates.set(name, html);
    return this;
  }

  /**
   * Get template
   */
  template(name: string): string {
    return this.templates.get(name) || '';
  }

  /**
   * Mock render function
   */
  render(html: string): string {
    return html;
  }

  /**
   * Register machine
   */
  registerMachine(name: string, machine: any): this {
    this.machines[name] = machine;
    return this;
  }

  /**
   * Register service
   */
  registerService(name: string, service: any): this {
    this.services[name] = service;
    return this;
  }
}

/**
 * Mock ShadowDOM for testing
 */
export class MockShadowDOM {
  private content: Map<string, Element> = new Map();
  private style: string = '';

  /**
   * Query selector
   */
  querySelector(selector: string): Element | null {
    for (const [, elem] of this.content) {
      if (this.matches(elem, selector)) {
        return elem;
      }
    }
    return null;
  }

  /**
   * Query selector all
   */
  querySelectorAll(selector: string): Element[] {
    const results: Element[] = [];
    for (const [, elem] of this.content) {
      if (this.matches(elem, selector)) {
        results.push(elem);
      }
    }
    return results;
  }

  /**
   * Add element
   */
  appendChild(element: any): void {
    const key = element.id || `elem_${this.content.size}`;
    this.content.set(key, element);
  }

  /**
   * Add style
   */
  addStyle(css: string): void {
    this.style += css;
  }

  /**
   * Get all content
   */
  getContent(): Element[] {
    return Array.from(this.content.values());
  }

  /**
   * Simple selector matching
   */
  private matches(elem: any, selector: string): boolean {
    if (selector.startsWith('#')) {
      return elem.id === selector.substring(1);
    }
    if (selector.startsWith('.')) {
      return (elem.className || '').includes(selector.substring(1));
    }
    return elem.tagName?.toLowerCase() === selector.toLowerCase();
  }

  /**
   * Clear all content
   */
  clear(): void {
    this.content.clear();
    this.style = '';
  }
}

/**
 * View test fixture for ViewComponent testing
 */
export class ViewTestFixture {
  private appContext: MockAppContext;
  private shadowDOM: MockShadowDOM;
  private eventLog: Array<{ event: string; target: string; payload?: any }> = [];

  constructor(appContext?: MockAppContext, shadowDOM?: MockShadowDOM) {
    this.appContext = appContext || new MockAppContext();
    this.shadowDOM = shadowDOM || new MockShadowDOM();

    // Set up global for testing
    if (typeof window !== 'undefined') {
      (window as any).__ux3App = this.appContext;
    }
  }

  /**
   * Get app context
   */
  getAppContext(): MockAppContext {
    return this.appContext;
  }

  /**
   * Get shadow DOM
   */
  getShadowDOM(): MockShadowDOM {
    return this.shadowDOM;
  }

  /**
   * Register template for state
   */
  registerStateTemplate(
    viewName: string,
    stateName: string,
    html: string
  ): this {
    const templateName = `${viewName}-${stateName}`;
    this.appContext.registerTemplate(templateName, html);
    return this;
  }

  /**
   * Register multiple state templates
   */
  registerStateTemplates(
    viewName: string,
    templates: Record<string, string>
  ): this {
    for (const [state, html] of Object.entries(templates)) {
      this.registerStateTemplate(viewName, state, html);
    }
    return this;
  }

  /**
   * Register layout template
   */
  registerLayout(name: string, html: string): this {
    this.appContext.registerTemplate(name, html);
    return this;
  }

  /**
   * Get rendered content
   */
  getRenderedContent(): string {
    const contentArea = this.shadowDOM.querySelector('#ux-content');
    return (contentArea as any)?.innerHTML || '';
  }

  /**
   * Find element by selector
   */
  find(selector: string): Element | null {
    return this.shadowDOM.querySelector(selector);
  }

  /**
   * Find all elements by selector
   */
  findAll(selector: string): Element[] {
    return this.shadowDOM.querySelectorAll(selector);
  }

  /**
   * Assert content contains text
   */
  assertContentContains(text: string): void {
    const content = this.getRenderedContent();
    if (!content.includes(text)) {
      throw new Error(
        `Expected content to contain '${text}', got: ${content}`
      );
    }
  }

  /**
   * Assert content does not contain text
   */
  assertContentNotContains(text: string): void {
    const content = this.getRenderedContent();
    if (content.includes(text)) {
      throw new Error(
        `Expected content NOT to contain '${text}', but it does: ${content}`
      );
    }
  }

  /**
   * Simulate user event
   */
  simulateEvent(
    selector: string,
    eventType: string,
    payload?: any
  ): void {
    const element = this.find(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    this.eventLog.push({
      event: eventType,
      target: selector,
      payload,
    });

    // Emit custom event
    const event = new CustomEvent(eventType, { detail: payload });
    (element as any).dispatchEvent?.(event);
  }

  /**
   * Get event log
   */
  getEventLog(): typeof this.eventLog {
    return [...this.eventLog];
  }

  /**
   * Assert event was simulated
   */
  assertEventOccurred(eventType: string, selector?: string): void {
    const found = this.eventLog.some(
      (e) =>
        e.event === eventType &&
        (!selector || e.target === selector)
    );

    if (!found) {
      throw new Error(
        `Expected event '${eventType}' not found in log: ${JSON.stringify(this.eventLog.map((e) => e.event))}`
      );
    }
  }

  /**
   * Clear event log
   */
  resetEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Clean up
   */
  cleanup(): void {
    this.shadowDOM.clear();
    this.eventLog = [];

    if (typeof window !== 'undefined') {
      delete (window as any).__ux3App;
    }
  }
}

/**
 * State rendering helper
 */
export class StateRenderingHelper {
  private templates: Map<string, string> = new Map();

  /**
   * Register state template
   */
  registerTemplate(state: string, html: string): this {
    this.templates.set(state, html);
    return this;
  }

  /**
   * Render state
   */
  render(state: string): string {
    const template = this.templates.get(state);
    if (!template) {
      throw new Error(`No template registered for state: ${state}`);
    }
    return template;
  }

  /**
   * Assert state renders specific content
   */
  assertStateRendersContent(state: string, expectedContent: string): void {
    const rendered = this.render(state);
    if (!rendered.includes(expectedContent)) {
      throw new Error(
        `State '${state}' template does not contain '${expectedContent}'.\nTemplate: ${rendered}`
      );
    }
  }

  /**
   * Get all registered states
   */
  getRegisteredStates(): string[] {
    return Array.from(this.templates.keys());
  }
}
