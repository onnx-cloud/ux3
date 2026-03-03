/**
 * Service Base Class
 * Abstract foundation for data service adapters
 */

import type { Middleware, ErrorHandler, ServiceConfig, Service } from './types.js';

export abstract class BaseService<T = any, R = any> {
  protected config: ServiceConfig;
  protected middlewares: Middleware[] = [];
  protected errorHandlers: ErrorHandler[] = [];

  constructor(config: ServiceConfig = {}) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Add middleware to request/response pipeline
   */
  addMiddleware(middleware: Middleware): Service<T, R> {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Add error handler for recovery
   */
  addErrorHandler(handler: ErrorHandler): Service<T, R> {
    this.errorHandlers.push(handler);
    return this;
  }

  /**
   * Core fetch method - implemented by subclasses
   */
  abstract fetch(request: T): Promise<R>;

  /**
   * Execute middlewares in order
   */
  protected async executeMiddlewares(request: T): Promise<R> {
    let index = 0;

    const next = async (req: T): Promise<R> => {
      if (index >= this.middlewares.length) {
        return this.fetch(req);
      }

      const middleware = this.middlewares[index++];
      // Middleware is generic but typed to accept our T and return Promise<R>
      return (middleware(req, next) as Promise<R>);
    };

    return next(request);
  }

  /**
   * Execute error handlers with retry logic
   */
  protected async executeErrorHandlers(error: Error): Promise<R> {
    for (const handler of this.errorHandlers) {
      try {
        // Handler is typed to return Promise<any> but we expect R
        const handlerResult = handler(error, () => this.fetch({} as T));
        return (await handlerResult) as R;
      } catch (e) {
        continue;
      }
    }
    throw error;
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async withRetry<V>(
    fn: () => Promise<V>,
    retries: number = this.config.retries!,
    delay: number = this.config.retryDelay!
  ): Promise<V> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await this.sleep(delay * Math.pow(2, i));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Timeout utility
   */
  protected async withTimeout<V>(
    promise: Promise<V>,
    timeout: number = this.config.timeout!
  ): Promise<V> {
    return Promise.race([
      promise,
      new Promise<V>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  }
}

// Backwards compatibility: some modules expect a `Service` export
export { BaseService as Service };