import { describe, it, expect, vi } from 'vitest';
import { requestIdMiddleware } from '../../src/services/middleware/request-id.js';
import { rateLimitMiddleware } from '../../src/services/middleware/rate-limit.js';
import { loggingMiddleware } from '../../src/services/middleware/logging.js';
import { sanitizeResponseMiddleware } from '../../src/services/middleware/sanitize.js';
import { metricsMiddleware } from '../../src/services/middleware/metrics.js';
import { timeoutMiddleware } from '../../src/services/middleware/timeout.js';
import { retryMiddleware } from '../../src/services/middleware/retry.js';
import { circuitBreakerMiddleware } from '../../src/services/middleware/circuit-breaker.js';
import { deduplicationMiddleware } from '../../src/services/middleware/dedup.js';
import { composeMiddleware } from '../../src/services/middleware/compose.js';
import { productionMiddlewareStack, developmentMiddlewareStack, testMiddlewareStack } from '../../src/services/middleware/presets.js';
import { ServiceError, ServiceErrorCode } from '../../src/services/types.js';

function nextOk() {
  return async (req: unknown) => ({ ok: true, data: req });
}

describe('requestIdMiddleware', () => {
  it('attaches requestId and x-request-id header', async () => {
    const mw = requestIdMiddleware();
    const result = await mw({}, nextOk()) as Record<string, unknown>;
    const reqData = (result as Record<string, unknown>).data as Record<string, unknown>;
    expect(reqData.requestId).toBeDefined();
    expect(typeof reqData.requestId).toBe('string');
    expect((reqData.headers as Record<string, string>)['x-request-id']).toBe(reqData.requestId);
  });

  it('preserves existing requestId', async () => {
    const mw = requestIdMiddleware();
    const result = await mw({ requestId: 'my-id' }, nextOk()) as Record<string, unknown>;
    const reqData = (result as Record<string, unknown>).data as Record<string, unknown>;
    expect(reqData.requestId).toBe('my-id');
  });

  it('generates unique IDs', async () => {
    const mw = requestIdMiddleware();
    const r1 = await mw({}, nextOk()) as Record<string, unknown>;
    const r2 = await mw({}, nextOk()) as Record<string, unknown>;
    const d1 = (r1 as Record<string, unknown>).data as Record<string, unknown>;
    const d2 = (r2 as Record<string, unknown>).data as Record<string, unknown>;
    expect(d1.requestId).not.toBe(d2.requestId);
  });
});

describe('rateLimitMiddleware', () => {
  it('allows requests within limit', async () => {
    const mw = rateLimitMiddleware({ windowMs: 1000, max: 5 });
    for (let i = 0; i < 5; i++) {
      await expect(mw({ baseUrl: '/test' }, nextOk())).resolves.toBeDefined();
    }
  });

  it('blocks requests over limit', async () => {
    const mw = rateLimitMiddleware({ windowMs: 1000, max: 2 });
    await mw({ baseUrl: '/test' }, nextOk());
    await mw({ baseUrl: '/test' }, nextOk());
    await expect(mw({ baseUrl: '/test' }, nextOk())).rejects.toThrow('Rate limit exceeded');
  });
});

describe('loggingMiddleware', () => {
  it('passes request through and returns response', async () => {
    const mw = loggingMiddleware('[Test]');
    const result = await mw({ method: 'GET', baseUrl: '/test' }, nextOk());
    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).ok).toBe(true);
  });

  it('redacts authorization headers', async () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const mw = loggingMiddleware('[Test]');
    await mw({
      method: 'GET',
      baseUrl: '/test',
      headers: { Authorization: 'Bearer secret123', 'Content-Type': 'application/json' },
    }, nextOk());
    const call = spy.mock.calls[0];
    if (call && call.length >= 2) {
      const logData = call[1] as Record<string, unknown>;
      const req = logData?.request as Record<string, unknown>;
      const headers = req?.headers as Record<string, string>;
      expect(headers?.Authorization).toBe('[REDACTED]');
    }
    spy.mockRestore();
  });

  it('logs errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mw = loggingMiddleware('[Test]');
    await expect(mw({ baseUrl: '/test' }, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('sanitizeResponseMiddleware', () => {
  it('passes through plain data', async () => {
    const mw = sanitizeResponseMiddleware();
    const result = await mw({}, nextOk());
    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).ok).toBe(true);
  });

  it('handles arrays', async () => {
    const mw = sanitizeResponseMiddleware();
    const result = await mw({}, async () => [{ name: 'test' }]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('handles nested objects', async () => {
    const mw = sanitizeResponseMiddleware();
    const result = await mw({}, async () => ({ users: [{ name: 'a' }], meta: { count: 1 } }));
    expect(result).toEqual({ users: [{ name: 'a' }], meta: { count: 1 } });
  });

  it('handles null gracefully', async () => {
    const mw = sanitizeResponseMiddleware();
    const result = await mw({}, async () => null);
    expect(result).toBeNull();
  });
});

describe('metricsMiddleware', () => {
  it('records successful calls', async () => {
    const records: Array<{ service: string; method: string; duration: number; success: boolean }> = [];
    const mw = metricsMiddleware({
      onRecord: (service, method, duration, success) => records.push({ service, method, duration, success }),
    });
    await mw({ service: 'api', method: 'getUsers' }, nextOk());
    expect(records).toHaveLength(1);
    expect(records[0].service).toBe('api');
    expect(records[0].method).toBe('getUsers');
    expect(records[0].success).toBe(true);
  });

  it('records failed calls', async () => {
    const records: Array<{ service: string; method: string; duration: number; success: boolean }> = [];
    const mw = metricsMiddleware({
      onRecord: (service, method, duration, success) => records.push({ service, method, duration, success }),
    });
    await expect(mw({ service: 'api', method: 'fail' }, async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    expect(records).toHaveLength(1);
    expect(records[0].success).toBe(false);
  });
});

describe('timeoutMiddleware', () => {
  it('passes through fast requests', async () => {
    const mw = timeoutMiddleware(5000);
    const result = await mw({}, async () => 'ok');
    expect(result).toBe('ok');
  });

  it('throws ServiceError on timeout', async () => {
    const mw = timeoutMiddleware(10);
    await expect(mw({}, async () => new Promise(r => setTimeout(r, 50, 'slow')))).rejects.toThrow();
  });
});

describe('retryMiddleware', () => {
  it('retries on failure and succeeds', async () => {
    const mw = retryMiddleware({ maxRetries: 3, initialDelay: 10, maxDelay: 100 });
    let calls = 0;
    const result = await mw({}, async () => {
      calls++;
      if (calls < 3) throw new Error('fail');
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('does not retry non-retryable ServiceErrors', async () => {
    const mw = retryMiddleware({ maxRetries: 3, initialDelay: 10 });
    let calls = 0;
    await expect(mw({}, async () => {
      calls++;
      throw new ServiceError('forbidden', ServiceErrorCode.FORBIDDEN, { retryable: false });
    })).rejects.toThrow('forbidden');
    expect(calls).toBe(1);
  });
});

describe('circuitBreakerMiddleware', () => {
  it('opens circuit after threshold failures', async () => {
    const mw = circuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 60000 });
    await expect(mw({}, async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    await expect(mw({}, async () => { throw new Error('fail'); })).rejects.toThrow('Circuit breaker opened');
  });

  it('resets circuit after success', async () => {
    const mw = circuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 60000 });
    await expect(mw({}, async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    const result = await mw({}, async () => 'ok');
    expect(result).toBe('ok');
  });
});

describe('deduplicationMiddleware', () => {
  it('coalesces concurrent identical requests', async () => {
    const mw = deduplicationMiddleware();
    let calls = 0;
    const handler = async (req: unknown) => {
      calls++;
      await new Promise(r => setTimeout(r, 30));
      return { data: req };
    };

    const [r1, r2, r3] = await Promise.all([
      mw({ method: 'GET', baseUrl: '/test', data: 'a' }, handler),
      mw({ method: 'GET', baseUrl: '/test', data: 'a' }, handler),
      mw({ method: 'GET', baseUrl: '/test', data: 'b' }, handler),
    ]);

    expect(calls).toBe(2);
    expect(r1).toBe(r2);
    expect(r2).not.toBe(r3);
  });

  it('allows unique requests through', async () => {
    const mw = deduplicationMiddleware();
    let calls = 0;
    const handler = async (_req: unknown) => { calls++; return { ok: true }; };

    await mw({ baseUrl: '/a' }, handler);
    await mw({ baseUrl: '/b' }, handler);
    expect(calls).toBe(2);
  });
});

describe('composeMiddleware', () => {
  it('composes multiple middlewares in order', async () => {
    const order: string[] = [];
    const mw1 = (req: unknown, next: (r: unknown) => Promise<unknown>) => { order.push('a'); return next(req); };
    const mw2 = (req: unknown, next: (r: unknown) => Promise<unknown>) => { order.push('b'); return next(req); };
    const composed = composeMiddleware([mw1, mw2]);

    await composed({}, async (_req) => { order.push('c'); return 'done'; });
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('handles empty array', async () => {
    const composed = composeMiddleware([]);
    const result = await composed({}, async () => 'ok');
    expect(result).toBe('ok');
  });

  it('handles single middleware', async () => {
    const mw = (req: unknown, next: (r: unknown) => Promise<unknown>) => next(`wrapped: ${req}`);
    const composed = composeMiddleware([mw]);
    const result = await composed('hello', async (r) => `echo: ${r}`);
    expect(result).toBe('echo: wrapped: hello');
  });
});

describe('presets', () => {
  it('production stack returns middleware', () => {
    const stack = productionMiddlewareStack();
    expect(typeof stack).toBe('function');
  });

  it('development stack returns middleware', () => {
    const stack = developmentMiddlewareStack();
    expect(typeof stack).toBe('function');
  });

  it('test stack returns middleware', () => {
    const stack = testMiddlewareStack();
    expect(typeof stack).toBe('function');
  });

  it('stacks are callable and pass through', async () => {
    const result = await productionMiddlewareStack()({ baseUrl: '/test', method: 'GET' }, nextOk());
    expect((result as Record<string, unknown>).ok).toBe(true);
  });
});
