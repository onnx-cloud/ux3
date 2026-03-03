import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InvokeRegistry, type InvokeResult, type InvokeOptions } from '../../src/services/invoke-registry.ts';
import type { AppContext } from '../../src/ui/app.ts';

describe('InvokeRegistry - Caching (Phase 1.3.1)', () => {
  let registry: InvokeRegistry;
  let mockApp: AppContext;
  let callCount: number;

  beforeEach(() => {
    callCount = 0;
    mockApp = {
      services: {
        api: {
          async getUser(id: number) {
            callCount++;
            return { id, name: `User ${id}`, email: `user${id}@example.com` };
          },
          async getPost(id: number) {
            callCount++;
            return { id, title: `Post ${id}`, content: 'Content...' };
          }
        },
        cache_service: {
          async slowFetch(params: any) {
            callCount++;
            // Simulate slow operation
            await new Promise(r => setTimeout(r, 50));
            return { data: `Result for ${params.key}` };
          }
        }
      }
    } as any;

    registry = new InvokeRegistry(mockApp);
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Cache Configuration', () => {
    it('should have default cache TTL of 5 minutes', () => {
      expect(registry.getDefaultCacheTTL()).toBe(5 * 60 * 1000);
    });

    it('should allow setting custom default cache TTL', () => {
      registry.setDefaultCacheTTL(10 * 60 * 1000);
      expect(registry.getDefaultCacheTTL()).toBe(10 * 60 * 1000);
    });

    it('should respect custom cache TTL in options', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true, ttl: 1000 }
      };

      const result1 = await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(result1.success).toBe(true);
      expect(callCount).toBe(1);

      // Call again immediately - should use cache
      const result2 = await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(result2.success).toBe(true);
      expect(callCount).toBe(1); // No new call
      expect(result2.data).toEqual(result1.data);
    });
  });

  describe('Cache Hit/Miss', () => {
    it('should return cached result on cache hit', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true }
      };

      // First call - cache miss
      const result1 = await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(1);

      // Second call - cache hit
      const result2 = await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(1); // No additional call
      expect(result2.data).toEqual(result1.data);
    });

    it('should call service again when cache is disabled', async () => {
      const options: InvokeOptions = {
        cache: { enabled: false }
      };

      // First call
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(1);

      // Second call - should not use cache
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(2); // New call made
    });

    it('should treat different service methods as separate cache entries', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true }
      };

      // Call getUser
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(1);

      // Call getPost - should not use getUser's cache
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getPost', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(2); // New call needed
    });

    it('should treat different services as separate cache entries', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true }
      };

      // Call api service
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(1);

      // Call cache_service - should not use api cache
      await registry.executeServiceInvoke(
        { service: 'cache_service', method: 'slowFetch', input: { key: 'test' } },
        undefined,
        options
      );

      expect(callCount).toBe(2); // New call needed
    });
  });

  describe('Cache Expiration', () => {
    it('should expire cached results after TTL', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true, ttl: 100 } // 100ms TTL
      };

      // First call - cache miss
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(1);

      // Second call - cache hit
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(1);

      // Wait for cache to expire
      await new Promise(r => setTimeout(r, 150));

      // Third call - cache expired, new call
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(2);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache for specific invoke', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true }
      };

      // Call and cache
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(1);

      // Invalidate cache
      registry.invalidateCache('api', 'getUser');

      // Call again
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(2); // New call made
    });

    it('should invalidate all cache for a service', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true }
      };

      // Cache multiple methods
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      await registry.executeServiceInvoke(
        { service: 'api', method: 'getPost', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(2);

      // Invalidate all api service cache
      registry.invalidateServiceCache('api');

      // Call again
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(3); // New call needed

      // This should also be expired
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getPost', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(4); // New call needed
    });

    it('should clear all cache when clear() is called', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true }
      };

      // Cache multiple invokes
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      await registry.executeServiceInvoke(
        { service: 'cache_service', method: 'slowFetch', input: { key: 'test' } },
        undefined,
        options
      );

      expect(callCount).toBe(2);

      // Clear all
      registry.clear();

      // Calls again - should miss cache
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      await registry.executeServiceInvoke(
        { service: 'cache_service', method: 'slowFetch', input: { key: 'test' } },
        undefined,
        options
      );

      expect(callCount).toBe(4); // Two new calls
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true }
      };

      // First call - miss
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      // Second and third calls - hits
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      const stats = registry.getCacheStats('api', 'getUser');
      expect(stats).toBeDefined();
      expect(stats?.hits).toBe(2);
      expect(stats?.misses).toBe(1);
    });

    it('should calculate cache hit rate correctly', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true }
      };

      // 1 miss, 3 hits = 75% hit rate
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      for (let i = 0; i < 3; i++) {
        await registry.executeServiceInvoke(
          { service: 'api', method: 'getUser', input: { id: 1 } },
          undefined,
          options
        );
      }

      const stats = registry.getCacheStats('api', 'getUser');
      expect(stats?.hitRate).toBeCloseTo(0.75, 2);
    });
  });

  describe('Custom Cache Keys', () => {
    it('should support custom cache keys', async () => {
      const options1: InvokeOptions = {
        cache: { enabled: true, key: 'custom-key-1' }
      };

      const options2: InvokeOptions = {
        cache: { enabled: true, key: 'custom-key-2' }
      };

      // Same service.method but different cache keys
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options1
      );

      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options2
      );

      expect(callCount).toBe(2); // Different cache keys = separate calls
    });

    it('should reuse cache when using same custom key', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true, key: 'my-custom-key' }
      };

      // First call
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      // Second call - same custom key
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      expect(callCount).toBe(1); // Cache hit with custom key
    });
  });

  describe('Source Function Caching', () => {
    it('should cache source function results', async () => {
      let srcCallCount = 0;
      const myFunction = async () => {
        srcCallCount++;
        return { result: 'test' };
      };

      const options: InvokeOptions = {
        cache: { enabled: true }
      };

      // First call
      const result1 = await registry.executeInvoke(
        { src: myFunction },
        undefined,
        options
      );

      // Second call
      const result2 = await registry.executeInvoke(
        { src: myFunction },
        undefined,
        options
      );

      expect(srcCallCount).toBe(1); // Only called once
      expect(result2.data).toEqual(result1.data);
    });
  });

  describe('Cache Entry Retrieval', () => {
    it('should retrieve all active cache entries', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true }
      };

      // Cache multiple entries
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      await registry.executeServiceInvoke(
        { service: 'api', method: 'getPost', input: { id: 1 } },
        undefined,
        options
      );

      const entries = registry.getCacheEntries();
      expect(Object.keys(entries).length).toBeGreaterThan(0);
      expect(Object.keys(entries).some(k => k.includes('getUser'))).toBe(true);
      expect(Object.keys(entries).some(k => k.includes('getPost'))).toBe(true);
    });

    it('should not include expired entries in cache retrieval', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true, ttl: 50 }
      };

      // Cache an entry
      await registry.executeServiceInvoke(
        { service: 'api', method: 'getUser', input: { id: 1 } },
        undefined,
        options
      );

      const entriesBefore = registry.getCacheEntries();
      expect(Object.keys(entriesBefore).length).toBeGreaterThan(0);

      // Wait for expiration
      await new Promise(r => setTimeout(r, 100));

      const entriesAfter = registry.getCacheEntries();
      expect(Object.keys(entriesAfter).length).toBe(0);
    });
  });

  describe('Cache with Errors', () => {
    it('should not cache failed invocations', async () => {
      const failingApp: AppContext = {
        services: {
          error_service: {
            async throwError() {
              callCount++;
              throw new Error('Service error');
            }
          }
        }
      } as any;

      const failRegistry = new InvokeRegistry(failingApp);
      const options: InvokeOptions = {
        cache: { enabled: true },
        maxRetries: 0
      };

      // First call - fails
      const result1 = await failRegistry.executeServiceInvoke(
        { service: 'error_service', method: 'throwError' },
        undefined,
        options
      );

      expect(result1.success).toBe(false);
      expect(callCount).toBe(1);

      // Second call - should not be cached, new error
      const result2 = await failRegistry.executeServiceInvoke(
        { service: 'error_service', method: 'throwError' },
        undefined,
        options
      );

      expect(result2.success).toBe(false);
      expect(callCount).toBe(2); // New call made (not cached)
    });
  });

  describe('Cache with Retry Logic', () => {
    it('should cache result after successful retry', async () => {
      let retryCallCount = 0;
      const retryApp: AppContext = {
        services: {
          retry_service: {
            async mayFail() {
              retryCallCount++;
              if (retryCallCount < 2) {
                throw new Error('First attempt fails');
              }
              return { success: true };
            }
          }
        }
      } as any;

      const retryRegistry = new InvokeRegistry(retryApp);
      const options: InvokeOptions = {
        cache: { enabled: true },
        maxRetries: 1
      };

      // First call - fails once, succeeds on retry, gets cached
      await retryRegistry.executeServiceInvoke(
        { service: 'retry_service', method: 'mayFail' },
        undefined,
        options
      );

      expect(retryCallCount).toBe(2);

      // Second call - should use cache
      await retryRegistry.executeServiceInvoke(
        { service: 'retry_service', method: 'mayFail' },
        undefined,
        options
      );

      expect(retryCallCount).toBe(2); // No new call
    });
  });

  describe('Performance Benefits', () => {
    it('should reduce response time for cached calls', async () => {
      const options: InvokeOptions = {
        cache: { enabled: true }
      };

      // First call
      const start1 = Date.now();
      await registry.executeServiceInvoke(
        { service: 'cache_service', method: 'slowFetch', input: { key: 'test' } },
        undefined,
        options
      );
      const duration1 = Date.now() - start1;

      // Second call - from cache (should be faster)
      const start2 = Date.now();
      await registry.executeServiceInvoke(
        { service: 'cache_service', method: 'slowFetch', input: { key: 'test' } },
        undefined,
        options
      );
      const duration2 = Date.now() - start2;

      // Cached call should be significantly faster
      expect(duration2).toBeLessThan(duration1 / 2);
    });
  });
});
