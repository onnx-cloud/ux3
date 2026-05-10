import { describe, it, expect, vi } from 'vitest';
import { BaseServiceAdapter } from '../../src/services/base.js';
import type { ServiceConfig } from '../../src/services/types.js';

class TestAdapter extends BaseServiceAdapter<string, string> {
  async transport(request: string): Promise<string> {
    return `echo: ${request}`;
  }
}

class FailingAdapter extends BaseServiceAdapter<string, string> {
  private failCount = 0;
  private failTimes: number;

  constructor(name: string, config: ServiceConfig, failTimes: number) {
    super(name, config);
    this.failTimes = failTimes;
  }

  async transport(request: string): Promise<string> {
    if (this.failCount < this.failTimes) {
      this.failCount++;
      throw new Error(`fail ${this.failCount}`);
    }
    return `echo: ${request}`;
  }
}

describe('BaseServiceAdapter', () => {
  it('stores name and config', () => {
    const adapter = new TestAdapter('test-svc', { timeout: 5000, retries: 2 });
    expect(adapter.name).toBe('test-svc');
    expect(adapter.config.timeout).toBe(5000);
    expect(adapter.config.retries).toBe(2);
  });

  it('applies default config values', () => {
    const adapter = new TestAdapter('test-svc');
    expect(adapter.config.timeout).toBe(30000);
    expect(adapter.config.retries).toBe(3);
    expect(adapter.config.retryDelay).toBe(1000);
  });

  it('executes the abstract method', async () => {
    const adapter = new TestAdapter('test-svc');
    const result = await adapter.execute('hello');
    expect(result).toBe('echo: hello');
  });

  it('supports middleware via addMiddleware', async () => {
    const adapter = new TestAdapter('test-svc');
    const middleware = vi.fn(async (req: string, next: (r: string) => Promise<string>) => {
      return next(`prefixed: ${req}`);
    });
    adapter.addMiddleware(middleware);

    const result = await adapter['executeMiddlewares']('hello');
    expect(result).toBe('echo: prefixed: hello');
    expect(middleware).toHaveBeenCalledTimes(1);
  });

  it('supports multiple middlewares in order', async () => {
    const order: string[] = [];
    const adapter = new TestAdapter('test-svc');
    adapter.addMiddleware(async (req, next) => { order.push('a'); return next(req); });
    adapter.addMiddleware(async (req, next) => { order.push('b'); return next(req); });
    adapter.addMiddleware(async (req, next) => { order.push('c'); return next(req); });

    await adapter['executeMiddlewares']('test');
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('withRetry succeeds on first attempt', async () => {
    const adapter = new TestAdapter('test');
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await adapter['withRetry'](fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('withRetry retries on failure', async () => {
    const adapter = new TestAdapter('test', { retryDelay: 10 });
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls < 3) throw new Error('fail');
      return 'ok';
    };
    const result = await adapter['withRetry'](fn, 3, 10);
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('withRetry throws after max retries', async () => {
    const adapter = new TestAdapter('test', { retryDelay: 10 });
    const fn = vi.fn().mockRejectedValue(new Error('always fail'));
    await expect(adapter['withRetry'](fn, 2, 10)).rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('withTimeout resolves within time', async () => {
    const adapter = new TestAdapter('test');
    const result = await adapter['withTimeout'](Promise.resolve('fast'), 5000);
    expect(result).toBe('fast');
  });

  it('addMiddleware returns this for chaining', () => {
    const adapter = new TestAdapter('test');
    const result = adapter.addMiddleware(async (r, n) => n(r));
    expect(result).toBe(adapter);
  });

  it('addErrorHandler returns this for chaining', () => {
    const adapter = new TestAdapter('test');
    const result = adapter.addErrorHandler(async (e, r) => { throw e; });
    expect(result).toBe(adapter);
  });
});
