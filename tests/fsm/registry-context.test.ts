import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FSMRegistry } from '../../src/fsm/registry.js';
import { StateMachine } from '../../src/fsm/state-machine.js';
import { resolveDotPath } from '../../src/utils/resolve.js';

describe('FSMRegistry root context and persistence', () => {
  beforeEach(() => {
    FSMRegistry.clear();
  });

  it('should notify subscribers when root context changes', async () => {
    const seen: Array<string | undefined> = [];
    const unsubscribe = FSMRegistry.subscribeRoot((ctx) => {
      seen.push((ctx as any).user?.name);
    });

    FSMRegistry.setRootContext({ user: { name: 'Alice' } });
    await new Promise((resolve) => queueMicrotask(resolve));
    FSMRegistry.setRootContext({ user: { name: 'Bob' } });
    await new Promise((resolve) => queueMicrotask(resolve));
    unsubscribe();
    FSMRegistry.setRootContext({ user: { name: 'Charlie' } });

    expect(seen).toEqual([undefined, 'Alice', 'Bob']);
  });

  it('resolveDotPath should support $-prefixed root lookups', () => {
    const data = {
      $: {
        user: { name: 'Alice' },
        theme: 'dark',
      },
      ctx: {
        currentPage: 2,
      },
    };

    expect(resolveDotPath(data, '$.user.name')).toBe('Alice');
    expect(resolveDotPath(data, '$.theme')).toBe('dark');
    expect(resolveDotPath(data, 'ctx.currentPage')).toBe(2);
  });

  it('should persist machine snapshots through the registry adapter', async () => {
    const storage: Record<string, any> = {};
    const adapter = {
      connect: vi.fn(async () => undefined),
      get: vi.fn(async (_model: string, id: any) => storage[id]),
      set: vi.fn(async (_model: string, id: any, data: any) => {
        storage[id] = data;
      }),
      delete: vi.fn(async () => undefined),
    };

    await FSMRegistry.initContextStorage(adapter as any, 60);

    const config = {
      id: 'test-machine',
      initial: 'idle',
      context: { count: 0 },
      states: {
        idle: {
          on: {
            INC: {
              target: 'idle',
              actions: [
                (ctx: any) => ({ count: ctx.count + 1 }),
              ],
            },
          },
        },
      },
    } as any;

    const fsm = new StateMachine(config, false);
    await FSMRegistry.registerMachine('test-machine', fsm);
    fsm.start();
    fsm.send('INC');

    expect(adapter.set).toHaveBeenCalled();
    expect(storage['test-machine']).toBeDefined();
    expect(storage['test-machine'].state).toBe('idle');
    expect(storage['test-machine'].context.count).toBe(1);
  });

  it('should hydrate root context from persistence on init', async () => {
    const storage: Record<string, any> = {
      root: {
        id: 'root',
        state: 'root',
        context: { user: { name: 'Persisted' } },
        version: 1,
        updatedAt: Date.now(),
      },
    };
    const adapter = {
      connect: vi.fn(async () => undefined),
      get: vi.fn(async (_model: string, id: any) => storage[id]),
      set: vi.fn(async () => undefined),
    };

    await FSMRegistry.initContextStorage(adapter as any, 60);
    expect(FSMRegistry.getRootContext().user?.name).toBe('Persisted');
  });
});
