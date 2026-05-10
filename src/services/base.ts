import type { Middleware, ErrorHandler, ServiceConfig, ServiceAdapter } from './types.js';
import { sleep } from './sleep.js';

export abstract class BaseServiceAdapter<TReq = unknown, TRes = unknown> implements ServiceAdapter<TReq, TRes> {
  readonly name: string;
  readonly config: ServiceConfig;
  protected middlewares: Middleware[] = [];
  protected errorHandlers: ErrorHandler[] = [];

  constructor(name: string, config: ServiceConfig = {}) {
    this.name = name;
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  abstract transport(request: TReq, signal?: AbortSignal): Promise<TRes>;

  async execute(request: TReq, signal?: AbortSignal): Promise<TRes> {
    return this.executeMiddlewares(request, signal);
  }

  addMiddleware(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  addErrorHandler(handler: ErrorHandler): this {
    this.errorHandlers.push(handler);
    return this;
  }

  destroy?(): void | Promise<void>;

  protected async executeMiddlewares(request: TReq, signal?: AbortSignal): Promise<TRes> {
    if (signal?.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });

    let index = 0;
    const next = async (req: TReq): Promise<TRes> => {
      if (index >= this.middlewares.length) {
        return this.transport(req, signal);
      }
      const middleware = this.middlewares[index++];
      return (middleware(req, next) as Promise<TRes>);
    };
    return next(request);
  }

  protected async executeErrorHandlers(error: Error, request: TReq): Promise<TRes> {
    for (const handler of this.errorHandlers) {
      try {
        const result = handler(error, () => this.transport(request));
        return (await result) as TRes;
      } catch {
        continue;
      }
    }
    throw error;
  }

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
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < retries - 1) {
          await sleep(delay * Math.pow(2, i));
        }
      }
    }
    throw lastError || new Error('Max retries exceeded');
  }

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

export class BaseService<T = unknown, R = unknown> extends BaseServiceAdapter<T, R> {
  constructor(config: ServiceConfig = {}) {
    super('', config);
  }

  async transport(request: T, signal?: AbortSignal): Promise<R> {
    throw new Error('transport() must be implemented by subclass');
  }

  async fetch(request: T): Promise<R> {
    return this.execute(request);
  }
}

export { sleep } from './sleep.js';
