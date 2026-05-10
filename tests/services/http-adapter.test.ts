import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HTTPService } from '../../src/services/http.js';
import { ServiceError, ServiceErrorCode } from '../../src/services/types.js';

describe('HTTPService', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('constructs with default config', () => {
    const svc = new HTTPService({ baseUrl: 'https://api.example.com' });
    expect(svc.config.timeout).toBe(30000);
    expect(svc.config.retries).toBe(3);
  });

  it('builds URLs with params', () => {
    const svc = new HTTPService({ baseUrl: 'https://api.example.com' });
    const url = (svc as never as { buildUrl: (c: { baseUrl: string; params?: Record<string, string> }) => string }).buildUrl({
      baseUrl: 'https://api.example.com/users',
      params: { page: '1', limit: '10' },
    });
    expect(url).toContain('page=1');
    expect(url).toContain('limit=10');
  });

  it('makes successful GET request', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ users: [{ id: 1 }] }),
    });

    const svc = new HTTPService({ baseUrl: 'https://api.example.com' });
    const response = await svc.get('https://api.example.com/users');
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ users: [{ id: 1 }] });
  });

  it('caches GET responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ users: [] }),
    });

    const svc = new HTTPService({ baseUrl: 'https://api.example.com' });
    await svc.execute({ baseUrl: 'https://api.example.com/users', method: 'GET' });
    await svc.execute({ baseUrl: 'https://api.example.com/users', method: 'GET' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws ServiceError on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers(),
    });

    const svc = new HTTPService({ baseUrl: 'https://api.example.com' });
    const response = await svc.get('https://api.example.com/secure');
    expect(response.ok).toBe(false);
    expect(response.error).toBeInstanceOf(ServiceError);
    expect((response.error as ServiceError).code).toBe(ServiceErrorCode.UNAUTHORIZED);
  });

  it('throws ServiceError on 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
    });

    const svc = new HTTPService({ baseUrl: 'https://api.example.com' });
    const response = await svc.get('https://api.example.com/missing');
    expect((response.error as ServiceError).code).toBe(ServiceErrorCode.NOT_FOUND);
  });

  it('returns retryable error on 429', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers(),
    });

    const svc = new HTTPService({ baseUrl: 'https://api.example.com' });
    const response = await svc.get('https://api.example.com/rate-limited');
    expect((response.error as ServiceError).code).toBe(ServiceErrorCode.RATE_LIMITED);
    expect((response.error as ServiceError).retryable).toBe(true);
  });

  it('returns retryable error on 500', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(),
    });

    const svc = new HTTPService({ baseUrl: 'https://api.example.com' });
    const response = await svc.get('https://api.example.com/broken');
    expect((response.error as ServiceError).code).toBe(ServiceErrorCode.UNKNOWN);
    expect((response.error as ServiceError).retryable).toBe(true);
  });

  it('makes POST request with body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      statusText: 'Created',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ id: 1, name: 'new' }),
    });

    const svc = new HTTPService({ baseUrl: 'https://api.example.com' });
    const response = await svc.post('https://api.example.com/users', { name: 'new' });
    expect(response.ok).toBe(true);
    expect(response.data.id).toBe(1);
  });

  it('clearCache empties cache', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ data: 'fresh' }),
    });

    const svc = new HTTPService({ baseUrl: 'https://api.example.com' });
    await svc.execute({ baseUrl: 'https://api.example.com/data', method: 'GET' });
    svc.clearCache();
    await svc.execute({ baseUrl: 'https://api.example.com/data', method: 'GET' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('handles network errors gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const svc = new HTTPService({ baseUrl: 'https://api.example.com' });
    const response = await svc.get('https://api.example.com/data');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(0);
    expect(response.error).toBeDefined();
  });

  it('handles text response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('plain text'),
    });

    const svc = new HTTPService({ baseUrl: 'https://api.example.com' });
    const response = await svc.get('https://api.example.com/text');
    expect(response.data).toBe('plain text');
  });

  it('throws ServiceError when baseUrl is empty string', async () => {
    const svc = new HTTPService({ baseUrl: '' });
    await expect(svc.execute({ method: 'GET', baseUrl: '' })).rejects.toThrow(ServiceError);
  });
});
