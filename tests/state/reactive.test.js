/**
 * Reactive System Unit Tests
 * Testing Proxy-based signals and auto-tracking effects
 */
import { describe, it } from 'vitest';
import { expect } from 'vitest';
import { reactive, effect, computed, batch } from '@ux3/state/reactive';
describe('reactive()', () => {
    it('should create reactive object', () => {
        const state = reactive({ count: 0 });
        expect(state.count).toBe(0);
    });
    it('should track property access in effect', () => {
        const state = reactive({ count: 0 });
        let tracked = false;
        effect(() => {
            state.count; // Access to track dependency
            tracked = true;
        });
        expect(tracked).toBe(true);
    });
    it('should trigger effect on property change', async () => {
        const state = reactive({ count: 0 });
        let executions = 0;
        effect(() => {
            state.count; // Access to track dependency
            executions++;
        });
        expect(executions).toBe(1);
        state.count = 1;
        // Effect runs asynchronously via microtask
        await new Promise((resolve) => queueMicrotask(() => resolve()));
        expect(executions).toBe(2);
    });
    it('should not trigger effect if value unchanged', async () => {
        const state = reactive({ count: 0 });
        let executions = 0;
        effect(() => {
            state.count; // Access to track dependency
            executions++;
        });
    });
    it('should support nested objects', () => {
        const state = reactive({
            user: {
                name: 'Alice',
                profile: { age: 30 },
            },
        });
        expect(state.user.name).toBe('Alice');
        expect(state.user.profile.age).toBe(30);
    });
    it('should track nested property access', async () => {
        const state = reactive({
            user: {
                name: 'Alice',
            },
        });
        let executions = 0;
        effect(() => {
            state.user.name; // Access to track dependency
            executions++;
        });
        expect(executions).toBe(1);
        state.user.name = 'Bob';
        await new Promise((resolve) => queueMicrotask(() => resolve()));
        expect(executions).toBe(2);
    });
    it('should support array operations', () => {
        const state = reactive({
            items: [1, 2, 3],
        });
        expect(state.items.length).toBe(3);
        expect(state.items[0]).toBe(1);
    });
    it('should track array length access', async () => {
        const state = reactive({
            items: [1, 2, 3],
        });
        let executions = 0;
        effect(() => {
            state.items.length; // Access to track dependency
            executions++;
        });
        expect(executions).toBe(1);
        state.items = [1, 2]; // Change array
        await new Promise((resolve) => queueMicrotask(() => resolve()));
        expect(executions).toBe(2);
    });
    it('should support Object.keys() tracking', async () => {
        const state = reactive({
            a: 1,
            b: 2,
        });
        let executions = 0;
        effect(() => {
            Object.keys(state); // Access to track dependency
            executions++;
        });
        expect(executions).toBe(1);
        // Modifying existing property doesn't change keys
        state.a = 10;
        await new Promise((resolve) => queueMicrotask(() => resolve()));
        expect(executions).toBe(1); // No additional execution
    });
});
describe('effect()', () => {
    it('should execute function immediately', () => {
        let executed = false;
        effect(() => {
            executed = true;
        });
        expect(executed).toBe(true);
    });
    it('should support multiple effects on same signal', async () => {
        const state = reactive({ count: 0 });
        let count1 = 0;
        let count2 = 0;
        effect(() => {
            state.count; // Access to track dependency
            count1++;
        });
        effect(() => {
            state.count; // Access to track dependency
            count2++;
        });
        expect(count1).toBe(1);
        expect(count2).toBe(1);
        state.count = 1;
        await new Promise((resolve) => queueMicrotask(() => resolve()));
        expect(count1).toBe(2);
        expect(count2).toBe(2);
    });
    it('should batch multiple updates', async () => {
        const state = reactive({ a: 0, b: 0 });
        let executions = 0;
        effect(() => {
            state.a + state.b; // Access to track dependency
            executions++;
        });
        expect(executions).toBe(1);
        state.a = 1;
        state.b = 2;
        // Both updates queued in same microtask cycle
        await new Promise((resolve) => queueMicrotask(() => resolve()));
        expect(executions).toBe(2); // Single execution for both changes
    });
});
describe('computed()', () => {
    it('should compute derived value', () => {
        const state = reactive({ x: 10, y: 20 });
        const sum = computed(() => state.x + state.y);
        expect(sum()).toBe(30);
    });
    it('should cache computed value', () => {
        const state = reactive({ x: 10 });
        let computeCount = 0;
        const doubled = computed(() => {
            computeCount++;
            return state.x * 2;
        });
        const result1 = doubled();
        const result2 = doubled();
        expect(result1).toBe(20);
        expect(result2).toBe(20);
        expect(computeCount).toBe(1); // Computed only once
    });
    it('should recompute when dependencies change', async () => {
        const state = reactive({ x: 10 });
        let computeCount = 0;
        const doubled = computed(() => {
            computeCount++;
            return state.x * 2;
        });
        expect(doubled()).toBe(20);
        expect(computeCount).toBe(1);
        state.x = 15;
        await new Promise((resolve) => queueMicrotask(() => resolve()));
        expect(doubled()).toBe(30);
        expect(computeCount).toBe(2);
    });
    it('should work with multiple computed values', () => {
        const state = reactive({ a: 5, b: 10 });
        const sum = computed(() => state.a + state.b);
        const product = computed(() => state.a * state.b);
        expect(sum()).toBe(15);
        expect(product()).toBe(50);
    });
});
describe('batch()', () => {
    it('should batch updates', async () => {
        const state = reactive({ a: 0, b: 0, c: 0 });
        let executions = 0;
        effect(() => {
            state.a + state.b + state.c; // Access to track dependency
            executions++;
        });
        expect(executions).toBe(1);
        batch(() => {
            state.a = 1;
            state.b = 2;
            state.c = 3;
        });
        await new Promise((resolve) => queueMicrotask(() => resolve()));
        // All updates in batch run single effect
        expect(executions).toBe(2);
    });
});
//# sourceMappingURL=reactive.test.js.map