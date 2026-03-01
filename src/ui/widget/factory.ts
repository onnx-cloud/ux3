/**
 * WidgetFactory - Lazy-loading widget instantiation and management
 */

import type { Widget, WidgetConfig } from './widget.js';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Widget loader function
 */
export type WidgetLoader = () => Promise<Widget | { default: Widget }>;

/**
 * WidgetFactory - Manages widget registration, lazy-loading, and caching
 */
export class WidgetFactory {
  private loaders: Map<string, WidgetLoader> = new Map();
  private cache: Map<string, Widget | any> = new Map();
  private pendingLoads: Map<string, Promise<any>> = new Map();
  // AsyncLocalStorage used to track current loader context and detect self-references
  private context = new AsyncLocalStorage<string>();

  /**
   * Register a widget synchronously
   */
  register(name: string, widget: Widget | any): void {
    this.cache.set(name, widget);
  }

  /**
   * Register a widget for lazy-loading
   * The loader function is called on first access
   */
  registerLazy(name: string, loader: WidgetLoader): void {
    this.loaders.set(name, loader);
  }

  /**
   * Get a widget - loads lazily if needed, returns from cache if available
   */
  async get(name: string): Promise<Widget | any> {
    // Return from cache if available
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }

    // Wait for pending load if in progress
    if (this.pendingLoads.has(name)) {
      const current = this.context.getStore();
      if (current === name) {
        // loader attempted to get the same name while it was still running
        throw new Error(`Circular widget dependency: ${name}`);
      }
      return this.pendingLoads.get(name)!;
    }

    // Load if lazy loader registered
    const loader = this.loaders.get(name);
    if (loader) {
      // create deferred promise so we can install pendingLoads before
      // actually invoking the loader (which may synchronously call get())
      const deferred: {
        promise: Promise<any>;
        resolve: (v: any) => void;
        reject: (e: any) => void;
      } = {} as any;
      deferred.promise = new Promise((res, rej) => {
        deferred.resolve = res;
        deferred.reject = rej;
      });

      // register as pending immediately so recursive get() calls can see it
      this.pendingLoads.set(name, deferred.promise);

      // run loader inside the async context to track origin
      this.context.run(name, async () => {
        try {
          const widget = await this.loadWidget(name, loader);
          this.cache.set(name, widget);
          deferred.resolve(widget);
        } catch (err) {
          deferred.reject(err);
        } finally {
          this.pendingLoads.delete(name);
        }
      });

      return deferred.promise;
    }

    throw new Error(`Widget not found: ${name}`);
  }

  /**
   * Load a widget and handle module format variations
   */
  private async loadWidget(name: string, loader: WidgetLoader): Promise<Widget | any> {
    const result = await loader();

    // Handle both default exports and named exports
    if (result && typeof result === 'object') {
      if ('default' in result) {
        return result.default;
      }
    }

    return result;
  }

  /**
   * Create a widget instance
   */
  async create(name: string, props?: any): Promise<HTMLElement> {
    const widget = await this.get(name);

    if (typeof widget === 'function') {
      // Class-based widget
      return new widget(props);
    } else if (typeof widget === 'object' && widget.create) {
      // Factory object
      return widget.create(props);
    } else {
      // Assume it's a Web Component class
      const element = new (widget as any)(props);
      return element as HTMLElement;
    }
  }

  /**
   * Preload a widget without instantiating it
   */
  async preload(name: string): Promise<void> {
    await this.get(name);
  }

  /**
   * Preload multiple widgets in parallel
   */
  async preloadMany(names: string[]): Promise<void> {
    await Promise.all(names.map((name) => this.preload(name)));
  }

  /**
   * Check if a widget is registered or loadable
   */
  has(name: string): boolean {
    return this.cache.has(name) || this.loaders.has(name);
  }

  /**
   * List all registered widgets
   */
  list(): string[] {
    const registered = Array.from(this.cache.keys());
    const lazy = Array.from(this.loaders.keys());
    return [...new Set([...registered, ...lazy])];
  }

  // Backwards-compatible alias expected by tests
  listWidgets(): string[] {
    return this.list();
  }

  /**
   * Clear cache (useful in tests or for memory management)
   * If a name is provided, clear only that widget from cache and loaders
   */
  clear(name?: string): void {
    if (name) {
      this.cache.delete(name);
      this.loaders.delete(name);
    } else {
      this.cache.clear();
      this.loaders.clear();
    }
  }

  /**
   * Clear a specific widget from cache (legacy API)
   */
  clearWidget(name: string): void {
    this.clear(name);
  }
}
