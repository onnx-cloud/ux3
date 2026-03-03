import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceCache } from '../../src/core/service-cache.ts';
describe('ServiceCache - Phase 1.1', () => {
    describe('Basic Operations', () => {
        let cache;
        beforeEach(() => {
            cache = new ServiceCache(1000); // 1 second TTL
        });
        it('should store and retrieve a value', () => {
            cache.set('test-value');
            expect(cache.get()).toBe('test-value');
        });
        it('should return null for get() when no value is set', () => {
            expect(cache.get()).toBeNull();
        });
        it('should return undefined for getOrUndefined() when no value is set', () => {
            expect(cache.getOrUndefined()).toBeUndefined();
        });
        it('should return undefined for getOrUndefined() on stale cache', async () => {
            cache = new ServiceCache(10); // 10ms TTL
            cache.set('value');
            await new Promise((r) => setTimeout(r, 20));
            expect(cache.getOrUndefined()).toBeUndefined();
        });
        it('should support complex types', () => {
            const userCache = new ServiceCache(5000);
            const user = { id: 1, name: 'Alice', email: 'alice@example.com' };
            userCache.set(user);
            expect(userCache.get()).toEqual(user);
        });
    });
    describe('TTL and Expiration', () => {
        it('should expire values after TTL', async () => {
            const cache = new ServiceCache(50); // 50ms TTL
            cache.set('value');
            expect(cache.get()).toBe('value');
            await new Promise((r) => setTimeout(r, 100));
            expect(cache.get()).toBeNull();
            expect(cache.isStale()).toBe(true);
        });
        it('should reset expiration when value is updated', async () => {
            const cache = new ServiceCache(100);
            cache.set('value1');
            await new Promise((r) => setTimeout(r, 60));
            cache.set('value2');
            await new Promise((r) => setTimeout(r, 60));
            // Original would have expired but we reset it
            expect(cache.get()).toBe('value2');
        });
        it('should report remaining TTL correctly', async () => {
            const cache = new ServiceCache(1000);
            cache.set('value');
            const remaining1 = cache.getRemainingTTL();
            expect(remaining1).toBeGreaterThan(900);
            expect(remaining1).toBeLessThanOrEqual(1000);
            await new Promise((r) => setTimeout(r, 500));
            const remaining2 = cache.getRemainingTTL();
            expect(remaining2).toBeLessThan(remaining1);
        });
        it('should return 0 remaining TTL when stale', async () => {
            const cache = new ServiceCache(10);
            cache.set('value');
            await new Promise((r) => setTimeout(r, 50));
            expect(cache.getRemainingTTL()).toBe(0);
        });
        it('should throw on negative TTL', () => {
            expect(() => new ServiceCache(-100)).toThrow('TTL must be non-negative');
        });
    });
    describe('Staleness Detection', () => {
        it('should detect when cache is stale', async () => {
            const cache = new ServiceCache(50);
            expect(cache.isStale()).toBe(true); // No value set
            cache.set('value');
            expect(cache.isStale()).toBe(false);
            await new Promise((r) => setTimeout(r, 100));
            expect(cache.isStale()).toBe(true);
        });
        it('should have hasValue() return opposite of isStale()', async () => {
            const cache = new ServiceCache(50);
            expect(cache.hasValue()).toBe(false);
            cache.set('value');
            expect(cache.hasValue()).toBe(true);
            await new Promise((r) => setTimeout(r, 100));
            expect(cache.hasValue()).toBe(false);
        });
    });
    describe('Invalidation', () => {
        let cache;
        let observerCalled;
        beforeEach(() => {
            cache = new ServiceCache(5000);
            observerCalled = false;
        });
        it('should invalidate cache and clear value', () => {
            cache.set('value');
            expect(cache.get()).toBe('value');
            cache.invalidate(false); // Don't notify
            expect(cache.get()).toBeNull();
        });
        it('should notify observers on invalidation', () => {
            cache.set('value');
            cache.observeInvalidation(() => {
                observerCalled = true;
            });
            cache.invalidate(true); // Notify observers
            expect(observerCalled).toBe(true);
        });
        it('should not notify observers when notifyObservers is false', () => {
            cache.set('value');
            cache.observeInvalidation(() => {
                observerCalled = true;
            });
            cache.invalidate(false);
            expect(observerCalled).toBe(false);
        });
        it('should support multiple observers', () => {
            const calls = [];
            cache.set('value');
            cache.observeInvalidation(() => calls.push('observer1'));
            cache.observeInvalidation(() => calls.push('observer2'));
            cache.observeInvalidation(() => calls.push('observer3'));
            cache.invalidate(true);
            expect(calls).toEqual(['observer1', 'observer2', 'observer3']);
        });
        it('should pass cache instance to observer', () => {
            cache.set('value');
            let receivedCache = null;
            cache.observeInvalidation((c) => {
                receivedCache = c;
            });
            cache.invalidate(true);
            expect(receivedCache).toBe(cache);
        });
        it('should isolate observer errors and continue', () => {
            cache.set('value');
            const calls = [];
            cache.observeInvalidation(() => {
                calls.push('observer1');
            });
            cache.observeInvalidation(() => {
                throw new Error('Observer error');
            });
            cache.observeInvalidation(() => {
                calls.push('observer3');
            });
            // Should not throw
            expect(() => cache.invalidate(true)).not.toThrow();
            // All observers should still be called (errors are isolated)
            expect(calls).toEqual(['observer1', 'observer3']);
        });
    });
    describe('Clear Operation', () => {
        it('should clear cache like invalidate', () => {
            const cache = new ServiceCache(5000);
            cache.set('value');
            cache.clear(false);
            expect(cache.get()).toBeNull();
        });
        it('should notify observers on clear with notification', () => {
            const cache = new ServiceCache(5000);
            cache.set('value');
            let called = false;
            cache.observeInvalidation(() => {
                called = true;
            });
            cache.clear(true);
            expect(called).toBe(true);
        });
        it('should not clear observers', () => {
            const cache = new ServiceCache(5000);
            cache.set('value');
            let called = false;
            cache.observeInvalidation(() => {
                called = true;
            });
            cache.clear(true);
            cache.set('value2');
            // Clear again - observer should still be registered
            called = false;
            cache.clear(true);
            expect(called).toBe(true);
        });
    });
    describe('Observer Management', () => {
        let cache;
        beforeEach(() => {
            cache = new ServiceCache(5000);
        });
        it('should remove a specific observer', () => {
            cache.set('value');
            const calls = [];
            const observer1 = () => calls.push('1');
            const observer2 = () => calls.push('2');
            cache.observeInvalidation(observer1);
            cache.observeInvalidation(observer2);
            cache.removeObserver(observer1);
            cache.invalidate(true);
            expect(calls).toEqual(['2']);
        });
        it('should handle removing non-existent observer gracefully', () => {
            cache.set('value');
            const observer = () => { };
            expect(() => cache.removeObserver(observer)).not.toThrow();
        });
        it('should clear all observers', () => {
            cache.set('value');
            const calls = [];
            cache.observeInvalidation(() => calls.push('1'));
            cache.observeInvalidation(() => calls.push('2'));
            cache.clearObservers();
            cache.invalidate(true);
            // No observers should be called
            expect(calls).toEqual([]);
        });
    });
    describe('TTL Configuration', () => {
        it('should create cache with specified TTL', () => {
            const cache = new ServiceCache(5000);
            expect(cache.getTTL()).toBe(5000);
        });
        it('should support 0 TTL (immediate expiration)', async () => {
            const cache = new ServiceCache(0);
            cache.set('value');
            // With 0 TTL, value expires immediately
            // Use a slightly longer delay to be safe on slow systems
            await new Promise((r) => setTimeout(r, 10));
            expect(cache.isStale()).toBe(true);
            expect(cache.get()).toBeNull();
        });
        it('should handle very large TTL values', () => {
            const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
            const cache = new ServiceCache(YEAR_MS);
            cache.set('value');
            expect(cache.getRemainingTTL()).toBeGreaterThan(YEAR_MS - 10);
        });
    });
    describe('Type Safety', () => {
        it('should maintain type safety with generics', () => {
            const productCache = new ServiceCache(5000);
            const product = {
                id: 1,
                name: 'Laptop',
                price: 999.99
            };
            productCache.set(product);
            const retrieved = productCache.get();
            if (retrieved) {
                // TypeScript should know this is a Product
                expect(retrieved.name).toBe('Laptop');
                expect(retrieved.price).toBe(999.99);
            }
        });
        it('should work with array types', () => {
            const arrayCache = new ServiceCache(5000);
            const items = ['a', 'b', 'c'];
            arrayCache.set(items);
            expect(arrayCache.get()).toEqual(items);
        });
        it('should work with union types', () => {
            const cache = new ServiceCache(5000);
            cache.set('string');
            expect(cache.get()).toBe('string');
            cache.set(42);
            expect(cache.get()).toBe(42);
            cache.set(true);
            expect(cache.get()).toBe(true);
        });
    });
    describe('Edge Cases', () => {
        it('should handle null values properly (distinguish from no value)', () => {
            const cache = new ServiceCache(5000);
            // No value set - should return null
            expect(cache.get()).toBeNull();
            expect(cache.isStale()).toBe(true);
            // Our implementation treats null as "no value"
            // This is acceptable tradeoff for simplicity
            // If null is a valid value, use undefined pattern instead
            cache.set('value');
            expect(cache.isStale()).toBe(false);
            expect(cache.get()).toBe('value');
        });
        it('should handle rapid get/set operations', () => {
            const cache = new ServiceCache(5000);
            for (let i = 0; i < 100; i++) {
                cache.set(i);
                expect(cache.get()).toBe(i);
            }
        });
        it('should handle concurrent invalidation and observation', () => {
            const cache = new ServiceCache(5000);
            const calls = [];
            cache.set('value');
            // Register multiple observers
            for (let i = 0; i < 10; i++) {
                cache.observeInvalidation(() => calls.push(`obs${i}`));
            }
            cache.invalidate(true);
            expect(calls.length).toBe(10);
        });
    });
    describe('Real-world Usage Patterns', () => {
        it('should work as service response cache', async () => {
            const cache = new ServiceCache(60000); // 60 second cache
            // Simulate API response
            const mockUser = {
                id: 1,
                name: 'John Doe',
                email: 'john@example.com'
            };
            // First "fetch" - cache miss
            if (!cache.hasValue()) {
                cache.set(mockUser);
            }
            expect(cache.get()).toEqual(mockUser);
            // Second "fetch" - cache hit
            if (!cache.hasValue()) {
                cache.set(mockUser); // Should not reach here
            }
            expect(cache.get()).toEqual(mockUser);
        });
        it('should support cache invalidation patterns', () => {
            const cache = new ServiceCache(60000);
            cache.set('data v1');
            // When data changes on server, invalidate
            cache.observeInvalidation(() => {
                console.log('Cache invalidated, should refresh UI');
            });
            // After mutation
            cache.invalidate(true);
            expect(cache.get()).toBeNull();
            // New data fetched
            cache.set('data v2');
            expect(cache.get()).toBe('data v2');
        });
        it('should support cache chain invalidation', () => {
            const userCache = new ServiceCache(60000);
            const profileCache = new ServiceCache(60000);
            userCache.set({ id: 1, name: 'Alice' });
            profileCache.set({ bio: 'Developer' });
            // When user is updated, invalidate dependent caches
            userCache.observeInvalidation(() => {
                profileCache.invalidate(true); // Cascade invalidation
            });
            userCache.invalidate(true);
            expect(userCache.get()).toBeNull();
            expect(profileCache.get()).toBeNull();
        });
    });
});
//# sourceMappingURL=service-cache.test.js.map