/**
 * WidgetFactory - Lazy-loading widget instantiation and management
 */
/**
 * Widget loader function
 */
export type WidgetLoader = () => Promise<HTMLElement | {
    default: HTMLElement;
}>;
/**
 * WidgetFactory - Manages widget registration, lazy-loading, and caching
 */
export declare class WidgetFactory {
    private loaders;
    private cache;
    private pendingLoads;
    private activeLoads;
    private loadTokens;
    private loaderContext;
    private getLoaderContext;
    /**
     * Register a widget synchronously
     */
    register(name: string, widget: unknown): void;
    /**
     * Register a widget for lazy-loading
     * The loader function is called on first access
     */
    registerLazy(name: string, loader: WidgetLoader): void;
    /**
     * Get a widget - loads lazily if needed, returns from cache if available
     */
    get(name: string): Promise<unknown>;
    /**
     * Load a widget and handle module format variations
     */
    private loadWidget;
    /**
     * Create a widget instance
     */
    create(name: string, props?: unknown): Promise<HTMLElement>;
    /**
     * Preload a widget without instantiating it
     */
    preload(name: string): Promise<void>;
    /**
     * Preload multiple widgets in parallel
     */
    preloadMany(names: string[]): Promise<void>;
    /**
     * Check if a widget is registered or loadable
     */
    has(name: string): boolean;
    /**
     * List all registered widgets
     */
    list(): string[];
    listWidgets(): string[];
    /**
     * Clear cache (useful in tests or for memory management)
     * If a name is provided, clear only that widget from cache and loaders
     */
    clear(name?: string): void;
    /**
     * Clear a specific widget from cache (legacy API)
     */
    clearWidget(name: string): void;
}
