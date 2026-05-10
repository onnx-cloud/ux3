import { describe, it, expect, vi } from 'vitest';
import { InvokeCache } from '../../src/services/invoke-cache.js';

describe('InvokeCache', () => {
  it('sets and gets a value', () => {
    const cache = new InvokeCache({ defaultTTL: 60000 });
    cache.set('key1', { data: 'hello' });
    expect(cache.get('key1')).toEqual({ data: 'hello' });
  });

  it('returns undefined for missing key', () => {
    const cache = new InvokeCache();
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('returns undefined for expired key', async () => {
    const cache = new InvokeCache({ defaultTTL: 10 });
    cache.set('key1', 'value');
    await new Promise(r => setTimeout(r, 20));
    expect(cache.get('key1')).toBeUndefined();
  });

  it('returns stale data with getStale', async () => {
    const cache = new InvokeCache({ defaultTTL: 10 });
    cache.set('key1', 'value');
    await new Promise(r => setTimeout(r, 20));
    expect(cache.getStale('key1', 1000)).toBe('value');
  });

  it('getStale returns undefined beyond maxStale', async () => {
    const cache = new InvokeCache({ defaultTTL: 10 });
    cache.set('key1', 'value');
    await new Promise(r => setTimeout(r, 20));
    expect(cache.getStale('key1', 5)).toBeUndefined();
  });

  it('invalidates a key', () => {
    const cache = new InvokeCache();
    cache.set('key1', 'value');
    expect(cache.get('key1')).toBe('value');
    cache.invalidate('key1');
    expect(cache.get('key1')).toBeUndefined();
  });

  it('invalidates by prefix', () => {
    const cache = new InvokeCache();
    cache.set('api.getUsers', 'users');
    cache.set('api.getPosts', 'posts');
    cache.set('other.data', 'data');

    cache.invalidateByPrefix('api.');
    expect(cache.get('api.getUsers')).toBeUndefined();
    expect(cache.get('api.getPosts')).toBeUndefined();
    expect(cache.get('other.data')).toBe('data');
  });

  it('reports stats correctly', () => {
    const cache = new InvokeCache({ defaultTTL: 60000 });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    cache.get('key1');
    cache.get('key1');
    cache.get('key2');
    cache.get('key3');

    const s = cache.stats();
    expect(s.hits).toBe(3);
    expect(s.misses).toBe(1);
    expect(s.hitRate).toBe(0.75);
    expect(s.size).toBe(2);
  });

  it('enforces max entries via LRU eviction', () => {
    const cache = new InvokeCache({ maxEntries: 2, defaultTTL: 60000 });
    cache.set('key1', 'v1');
    cache.set('key2', 'v2');
    cache.set('key3', 'v3');

    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(true);
    expect(cache.has('key3')).toBe(true);
  });

  it('promotes LRU on access', () => {
    const cache = new InvokeCache({ maxEntries: 2, defaultTTL: 60000 });
    cache.set('key1', 'v1');
    cache.set('key2', 'v2');
    cache.get('key1');
    cache.set('key3', 'v3');

    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
    expect(cache.has('key3')).toBe(true);
  });

  it('warm fetches on cache miss', async () => {
    const cache = new InvokeCache({ defaultTTL: 60000 });
    const fetcher = vi.fn().mockResolvedValue('fresh');
    const result = await cache.warm('key1', fetcher);
    expect(result).toBe('fresh');
    expect(fetcher).toHaveBeenCalledTimes(1);

    const cached = await cache.warm('key1', fetcher);
    expect(cached).toBe('fresh');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('staleWhileRevalidate returns stale and refreshes', async () => {
    const cache = new InvokeCache({ defaultTTL: 10 });
    cache.set('key1', 'old');

    await new Promise(r => setTimeout(r, 20));

    let fetched = false;
    const result = await cache.staleWhileRevalidate('key1', async () => {
      fetched = true;
      return 'new';
    }, { ttl: 60000, maxStaleMs: 5000 });

    expect(result.data).toBe('old');
    expect(result.fromCache).toBe(true);
    expect(fetched).toBe(true);
  });

  it('staleWhileRevalidate fetches on cache miss', async () => {
    const cache = new InvokeCache({ defaultTTL: 60000 });
    const result = await cache.staleWhileRevalidate('key1', async () => 'fresh');
    expect(result.data).toBe('fresh');
    expect(result.fromCache).toBe(false);
  });

  it('clear removes all entries', () => {
    const cache = new InvokeCache();
    cache.set('key1', 'v1');
    cache.set('key2', 'v2');
    cache.clear();
    expect(cache.stats().size).toBe(0);
  });

  it('respects custom TTL on set', async () => {
    const cache = new InvokeCache({ defaultTTL: 60000 });
    cache.set('key1', 'value', { ttl: 10 });
    await new Promise(r => setTimeout(r, 20));
    expect(cache.get('key1')).toBeUndefined();
  });
});
