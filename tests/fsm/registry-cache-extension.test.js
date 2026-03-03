import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FSMRegistry } from '../../src/fsm/registry.ts';
import { ServiceCache } from '../../src/core/service-cache.ts';
describe('FSMRegistry Cache Extension - Phase 1.2', () => {
    beforeEach(() => {
        FSMRegistry.clear();
    });
    afterEach(() => {
        FSMRegistry.clear();
    });
    describe('getServiceCache()', () => {
        it('should return a ServiceCache instance', () => {
            const cache = FSMRegistry.getServiceCache('user');
            expect(cache).toBeInstanceOf(ServiceCache);
        });
        it('should create cache with default 60-second TTL', () => {
            const cache = FSMRegistry.getServiceCache('user');
            expect(cache.getTTL()).toBe(60000);
        });
        it('should create cache with custom TTL', () => {
            const cache = FSMRegistry.getServiceCache('products', 30000);
            expect(cache.getTTL()).toBe(30000);
        });
        it('should return the same cache instance for same service name', () => {
            const cache1 = FSMRegistry.getServiceCache('user');
            const cache2 = FSMRegistry.getServiceCache('user');
            expect(cache1).toBe(cache2);
        });
        it('should create separate caches for different services', () => {
            const userCache = FSMRegistry.getServiceCache('user');
            const productCache = FSMRegistry.getServiceCache('product');
            expect(userCache).not.toBe(productCache);
        });
        it('should throw on invalid service name', () => {
            expect(() => FSMRegistry.getServiceCache('')).toThrow('[UX3] Service name must be a non-empty string');
            expect(() => FSMRegistry.getServiceCache(null)).toThrow('[UX3] Service name must be a non-empty string');
            expect(() => FSMRegistry.getServiceCache(undefined)).toThrow('[UX3] Service name must be a non-empty string');
        });
    });
    describe('Cache Usage', () => {
        it('should cache service responses', () => {
            const userCache = FSMRegistry.getServiceCache('user');
            const userData = { id: 1, name: 'Alice' };
            userCache.set(userData);
            expect(userCache.get()).toEqual(userData);
        });
        it('should support multiple caches with independence', () => {
            const userCache = FSMRegistry.getServiceCache('user');
            const productCache = FSMRegistry.getServiceCache('product');
            userCache.set({ id: 1, name: 'Alice' });
            productCache.set({ id: 1, name: 'Laptop', price: 999 });
            expect(userCache.get()).toEqual({ id: 1, name: 'Alice' });
            expect(productCache.get()).toEqual({ id: 1, name: 'Laptop', price: 999 });
        });
        it('should work with observer pattern', () => {
            const cache = FSMRegistry.getServiceCache('user');
            let invalidationCount = 0;
            cache.observeInvalidation(() => {
                invalidationCount++;
            });
            cache.set({ id: 1, name: 'Alice' });
            cache.invalidate(true);
            expect(invalidationCount).toBe(1);
        });
    });
    describe('clearServiceCache()', () => {
        it('should clear specific service cache', () => {
            const cache = FSMRegistry.getServiceCache('user');
            cache.set({ id: 1, name: 'Alice' });
            expect(cache.get()).not.toBeNull();
            FSMRegistry.clearServiceCache('user');
            expect(cache.get()).toBeNull();
        });
        it('should only clear the specified cache', () => {
            const userCache = FSMRegistry.getServiceCache('user');
            const productCache = FSMRegistry.getServiceCache('product');
            userCache.set({ id: 1, name: 'Alice' });
            productCache.set({ id: 1, name: 'Laptop' });
            FSMRegistry.clearServiceCache('user');
            expect(userCache.get()).toBeNull();
            expect(productCache.get()).not.toBeNull();
        });
        it('should handle clearing non-existent cache gracefully', () => {
            expect(() => FSMRegistry.clearServiceCache('nonexistent')).not.toThrow();
        });
    });
    describe('clearAllServiceCaches()', () => {
        it('should clear all service caches', () => {
            const userCache = FSMRegistry.getServiceCache('user');
            const productCache = FSMRegistry.getServiceCache('product');
            const orderCache = FSMRegistry.getServiceCache('order');
            userCache.set({ id: 1 });
            productCache.set({ id: 1 });
            orderCache.set({ id: 1 });
            FSMRegistry.clearAllServiceCaches();
            expect(userCache.get()).toBeNull();
            expect(productCache.get()).toBeNull();
            expect(orderCache.get()).toBeNull();
        });
        it('should not affect new cache creation', () => {
            const cache1 = FSMRegistry.getServiceCache('user');
            cache1.set({ id: 1 });
            FSMRegistry.clearAllServiceCaches();
            const cache2 = FSMRegistry.getServiceCache('user');
            expect(cache2).toBe(cache1); // Same instance
            expect(cache2.get()).toBeNull(); // But cleared
        });
    });
    describe('Integration with FSMRegistry.clear()', () => {
        it('should clear all caches when FSMRegistry.clear() is called', () => {
            const userCache = FSMRegistry.getServiceCache('user');
            const productCache = FSMRegistry.getServiceCache('product');
            userCache.set({ id: 1 });
            productCache.set({ id: 1 });
            FSMRegistry.clear();
            expect(userCache.get()).toBeNull();
            expect(productCache.get()).toBeNull();
        });
        it('should allow fresh cache creation after clear()', () => {
            const cache1 = FSMRegistry.getServiceCache('user');
            cache1.set({ id: 1 });
            FSMRegistry.clear();
            const cache2 = FSMRegistry.getServiceCache('user');
            // After clear, caches map is cleared, so new instance is created
            // Verify the cache was cleared and is usable
            expect(cache2.get()).toBeNull();
            // And can be used for new data
            cache2.set({ id: 2 });
            expect(cache2.get()).toEqual({ id: 2 });
        });
    });
    describe('Real-world Usage Patterns', () => {
        it('should cache API responses with TTL', async () => {
            // Cache with 100ms TTL
            const cache = FSMRegistry.getServiceCache('api', 100);
            // Simulate API call
            const response = {
                data: 'Hello, World!',
                timestamp: Date.now()
            };
            cache.set(response);
            // First access - from cache
            let fromCache = cache.get();
            expect(fromCache).toEqual(response);
            // Wait for expiration
            await new Promise((r) => setTimeout(r, 150));
            // After expiration - cache is stale
            fromCache = cache.get();
            expect(fromCache).toBeNull();
        });
        it('should support multi-tenant caching', () => {
            // Different services for different tenants
            const tenant1UserCache = FSMRegistry.getServiceCache('tenant-1:user');
            const tenant2UserCache = FSMRegistry.getServiceCache('tenant-2:user');
            tenant1UserCache.set({ id: 1, name: 'Alice' });
            tenant2UserCache.set({ id: 1, name: 'Bob' });
            expect(tenant1UserCache.get()).toEqual({ id: 1, name: 'Alice' });
            expect(tenant2UserCache.get()).toEqual({ id: 1, name: 'Bob' });
        });
        it('should support cascade invalidation', () => {
            const userCache = FSMRegistry.getServiceCache('user');
            const profileCache = FSMRegistry.getServiceCache('profile');
            const settingsCache = FSMRegistry.getServiceCache('settings');
            userCache.set({ id: 1, name: 'Alice' });
            profileCache.set({ bio: 'Developer' });
            settingsCache.set({ theme: 'dark' });
            // When user changes, invalidate dependent caches
            userCache.observeInvalidation(() => {
                FSMRegistry.clearServiceCache('profile');
                FSMRegistry.clearServiceCache('settings');
            });
            FSMRegistry.clearServiceCache('user');
            expect(userCache.get()).toBeNull();
            expect(profileCache.get()).toBeNull();
            expect(settingsCache.get()).toBeNull();
        });
        it('should support cache warming pattern', () => {
            const cache = FSMRegistry.getServiceCache('initial-data');
            // Pre-populate cache with initial data
            const initialData = {
                version: '1.0.0',
                config: { debug: false },
                features: ['a', 'b', 'c']
            };
            cache.set(initialData);
            // Application starts with pre-warmed cache
            expect(cache.get()).toEqual(initialData);
        });
    });
    describe('Concurrency and Race Conditions', () => {
        it('should handle concurrent access safely', () => {
            const cache = FSMRegistry.getServiceCache('concurrent');
            const results = [];
            for (let i = 0; i < 100; i++) {
                cache.set(i);
                results.push(cache.get());
            }
            // Should have completed all operations
            expect(results.length).toBe(100);
            expect(cache.get()).toBe(99); // Last value set
        });
        it('should handle concurrent cache creation for same service', () => {
            const caches = [];
            for (let i = 0; i < 10; i++) {
                caches.push(FSMRegistry.getServiceCache('same-service'));
            }
            // All should be the same instance
            for (let i = 1; i < caches.length; i++) {
                expect(caches[i]).toBe(caches[0]);
            }
        });
    });
});
//# sourceMappingURL=registry-cache-extension.test.js.map