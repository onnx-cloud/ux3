/**
 * Service Base Class
 * Abstract foundation for data service adapters
 */
import type { Middleware, ErrorHandler, ServiceConfig, Service } from './types.js';
export declare abstract class BaseService<T = any, R = any> {
    protected config: ServiceConfig;
    protected middlewares: Middleware[];
    protected errorHandlers: ErrorHandler[];
    constructor(config?: ServiceConfig);
    /**
     * Add middleware to request/response pipeline
     */
    addMiddleware(middleware: Middleware): Service<T, R>;
    /**
     * Add error handler for recovery
     */
    addErrorHandler(handler: ErrorHandler): Service<T, R>;
    /**
     * Core fetch method - implemented by subclasses
     */
    abstract fetch(request: T): Promise<R>;
    /**
     * Execute middlewares in order
     */
    protected executeMiddlewares(request: T): Promise<R>;
    /**
     * Execute error handlers with retry logic
     */
    protected executeErrorHandlers(error: Error): Promise<R>;
    /**
     * Retry logic with exponential backoff
     */
    protected withRetry<V>(fn: () => Promise<V>, retries?: number, delay?: number): Promise<V>;
    /**
     * Sleep utility
     */
    protected sleep(ms: number): Promise<void>;
    /**
     * Timeout utility
     */
    protected withTimeout<V>(promise: Promise<V>, timeout?: number): Promise<V>;
}
export { BaseService as Service };
