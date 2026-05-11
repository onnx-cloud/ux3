/**
 * Service Base Class
 * Abstract foundation for data service adapters
 */
import type { Middleware, ErrorHandler, ServiceConfig, Service } from './types.js';
export declare abstract class BaseService<T = any, R = any> {
    protected config: ServiceConfig;
    protected middlewares: Middleware[];
    constructor(config?: ServiceConfig);
    addMiddleware(middleware: Middleware): Service<T, R>;
    addErrorHandler(handler: ErrorHandler): Service<T, R>;
    abstract fetch(request: T): Promise<R>;
    protected executeMiddlewares(request: T): Promise<R>;
    protected withRetry<V>(fn: () => Promise<V>, retries?: number, delay?: number): Promise<V>;
    protected sleep(ms: number): Promise<void>;
    protected withTimeout<V>(promise: Promise<V>, timeout?: number): Promise<V>;
}
export { BaseService as Service };
