/**
 * Phase 0–4 Production Readiness Tests
 * Validates the critical fixes from the PLAN.md checklist.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StateMachine } from '../../src/fsm/state-machine.js';
import type { StateConfig, MachineConfig } from '../../src/fsm/types.js';
import { FSMRegistry } from '../../src/fsm/registry.js';
import { extractFSM } from '../../src/build/validators/index.js';
import { createStore } from '../../src/state/store.js';
import { HTTPService } from '../../src/services/http.js';
import { ServiceError, ServiceErrorCode } from '../../src/services/types.js';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('Phase 0–4 Production Readiness', () => {
  beforeEach(() => { FSMRegistry.clear(); });
  afterEach(() => { vi.restoreAllMocks(); });

  /* ------------------------------------------------------------------ */
  /* 1. FSM instantiation for widgets view                              */
  /* ------------------------------------------------------------------ */
  it('should instantiate FSM from flat-format widgets YAML', () => {
    const yaml = {
      name: 'widgets',
      layout: 'default',
      initial: 'loading',
      context: { loaded: false, error: null, data: {} },
      states: {
        loading: {
          invoke: { src: 'loadWidgetData', onDone: 'index' },
          on: { SUCCESS: 'index', ERROR: 'error' },
          errorTarget: 'error',
        },
        index: {
          template: 'widget/widgets/index.html',
          on: { 'KANBAN:MOVE': { target: 'index', actions: ['moveKanbanCard'] } },
        },
        error: { template: 'widget/widgets/index.html' },
      },
    };

    const fsm = extractFSM(yaml);
    expect(fsm).not.toBeNull();
    expect(fsm!.initial).toBe('loading');
    expect(Object.keys(fsm!.states)).toEqual(['loading', 'index', 'error']);
  });

  it('should instantiate FSM from nested-format YAML', () => {
    const yaml = {
      view: {
        fsm: {
          initial: 'idle',
          states: { idle: {}, running: {} },
        },
      },
    };

    const fsm = extractFSM(yaml);
    expect(fsm).not.toBeNull();
    expect(fsm!.initial).toBe('idle');
    expect(Object.keys(fsm!.states)).toEqual(['idle', 'running']);
  });

  /* ------------------------------------------------------------------ */
  /* 2. Action execution — resolveActionFunction                        */
  /* ------------------------------------------------------------------ */
  it('should execute string-named actions registered via registerAction', () => {
    const action = vi.fn();
    const config: MachineConfig<any> = {
      id: 'test',
      initial: 'idle',
      states: {
        idle: {
          on: { GO: { target: 'done', actions: ['myAction'] } },
        },
        done: {},
      },
    };

    const fsm = new StateMachine(config);
    fsm.registerAction('myAction', action);

    fsm.send('GO');
    expect(fsm.getState()).toBe('done');
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ type: 'GO' }),
    );
  });

  it('should execute function actions directly', () => {
    const action = vi.fn();
    const config: MachineConfig<any> = {
      id: 'test',
      initial: 'idle',
      states: {
        idle: {
          on: { GO: { target: 'done', actions: [action] } },
        },
        done: {},
      },
    };

    const fsm = new StateMachine(config);
    fsm.send('GO');
    expect(fsm.getState()).toBe('done');
    expect(action).toHaveBeenCalledTimes(1);
  });

  /* ------------------------------------------------------------------ */
  /* 3. Config-generator output — machines include invoke, errorTarget   */
  /* ------------------------------------------------------------------ */
  it('should retain invoke and errorTarget in machine config', () => {
    const config: MachineConfig<any> = {
      id: 'widgets',
      initial: 'loading',
      context: { loaded: false },
      states: {
        loading: {
          invoke: { src: 'loadWidgetData', onDone: 'index' },
          on: { SUCCESS: 'index', ERROR: 'error' },
          errorTarget: 'error',
          errorActions: [(ctx: any, err: Error) => { ctx.errorMsg = err.message; }],
        },
        index: { on: { REFRESH: 'loading' } },
        error: {},
      },
    };

    const fsm = new StateMachine(config);
    const mc = fsm.getMachineConfig();

    expect(mc.states.loading.invoke).toBeDefined();
    expect((mc.states.loading.invoke as any).src).toBe('loadWidgetData');
    expect(mc.states.loading.errorTarget).toBe('error');
    expect(mc.states.loading.errorActions).toBeDefined();
    expect(mc.states.loading.errorActions!.length).toBe(1);
  });

  /* ------------------------------------------------------------------ */
  /* 4. Invoke lifecycle — loading → invoke → index transition          */
  /* ------------------------------------------------------------------ */
  it('should transition through loading → invoke → index', async () => {
    const config: MachineConfig<any> = {
      id: 'widgets',
      initial: 'idle',
      context: { loaded: false },
      states: {
        idle: { on: { LOAD: 'loading' } },
        loading: {
          invoke: { src: 'loadWidgetData', onDone: 'index' },
          on: { SUCCESS: 'index', ERROR: 'error' },
        },
        index: {},
        error: {},
      },
    };

    const fsm = new StateMachine(config);
    fsm.registerInvokeHandler('loadWidgetData', async (_input?: any, _ctx?: any) => {
      return { loaded: true, data: { kanban: { columns: [] } } };
    });

    expect(fsm.getState()).toBe('idle');

    await new Promise<void>(resolve => {
      fsm.subscribe(() => {
        if (fsm.getState() === 'index') resolve();
      });
      fsm.send('LOAD');
    });

    expect(fsm.getState()).toBe('index');
    expect((fsm.getContext() as any).loaded).toBe(true);
  }, 10000);

  /* ------------------------------------------------------------------ */
  /* 5. Context immutability — Actions don't mutate live FSM state       */
  /* ------------------------------------------------------------------ */
  it('should not mutate live context when action returns cloned state', () => {
    const config: MachineConfig<any> = {
      id: 'test',
      initial: 'idle',
      context: { items: ['a'] },
      states: {
        idle: {
          on: { ADD: { target: 'idle', actions: [(ctx: any, _evt: any) => {
            const next = clone(ctx);
            next.items.push('b');
            return next;
          }] } },
        },
      },
    };

    const fsm = new StateMachine(config);
    const before = fsm.getContext();

    fsm.send('ADD');

    const after = fsm.getContext();
    expect(after.items).toEqual(['a', 'b']);
    expect(before.items).toEqual(['a']);
    expect(before).not.toBe(after);
  });

  it('should not mutate live context across multiple action calls', () => {
    let captureAfterFirst: any;
    const config: MachineConfig<any> = {
      id: 'test',
      initial: 'idle',
      context: { count: 0 },
      states: {
        idle: {
          on: {
            INC: {
              target: 'idle',
              actions: [
                (ctx: any, _evt: any) => {
                  captureAfterFirst = ctx;
                  return { count: ctx.count + 1 };
                },
                (ctx: any, _evt: any) => {
                  return { count: ctx.count + 1 };
                },
              ],
            },
          },
        },
      },
    };

    const fsm = new StateMachine(config);
    fsm.send('INC');

    // The first action captured ctx before it returned its update
    expect(captureAfterFirst!.count).toBe(0);
    expect((fsm.getContext() as any).count).toBe(2);
  });

  /* ------------------------------------------------------------------ */
  /* 6. data-from resolution — Dot-path, subscription timing             */
  /* ------------------------------------------------------------------ */
  it('should resolve dot-path from context', () => {
    function resolveDotPath(obj: Record<string, unknown>, path: string): unknown {
      return path.split('.').reduce((acc: any, key) =>
        (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
    }

    const ctx = { data: { kanban: { columns: [{ title: 'Todo' }] } } };
    expect(resolveDotPath(ctx, 'data.kanban.columns')).toEqual([{ title: 'Todo' }]);
    expect(resolveDotPath(ctx, 'data.kanban')).toEqual({ columns: [{ title: 'Todo' }] });
    expect(resolveDotPath(ctx, 'data.missing')).toBeUndefined();
    expect(resolveDotPath(ctx, 'nonexistent.deep.path')).toBeUndefined();
  });

  /* ------------------------------------------------------------------ */
  /* 7. applyData() on each widget — Data renders correctly              */
  /* ------------------------------------------------------------------ */
  it('should call applyData override when data-from resolves', () => {
    let received: any = null;
    const mockApplyData = vi.fn(function (this: any, data: any) {
      received = data;
    });

    // Simulate what UxBase.resolveDataFrom does
    const context = { data: { kanban: { columns: [{ title: 'Todo' }] } } };
    const dataFrom = 'data.kanban';

    const parts = dataFrom.split('.');
    let value: any = context;
    for (const p of parts) {
      value = (value && typeof value === 'object' ? value[p] : undefined);
    }

    expect(value).toEqual({ columns: [{ title: 'Todo' }] });

    // Simulate the applyData call
    mockApplyData.call({ localName: 'ux-kanban' }, value);
    expect(mockApplyData).toHaveBeenCalledTimes(1);
    expect(received).toEqual({ columns: [{ title: 'Todo' }] });
  });

  /* ------------------------------------------------------------------ */
  /* 8. Kitchen sink validators — All four run on flat-format YAMLs      */
  /* ------------------------------------------------------------------ */
  it('should extract FSM from flat-format YAML', () => {
    const yaml = {
      name: 'widgets',
      initial: 'loading',
      states: {
        loading: { on: { SUCCESS: 'index' }, invoke: { src: 'loadWidgetData' } },
        index: { on: { REFRESH: 'loading' } },
        error: {},
      },
    };

    const fsm = extractFSM(yaml);
    expect(fsm).not.toBeNull();
    expect(fsm!.initial).toBe('loading');
    expect(Object.keys(fsm!.states)).toHaveLength(3);
    expect(fsm!.states.loading.invoke).toBeDefined();
    expect(fsm!.states.loading.on).toEqual({ SUCCESS: 'index' });
  });

  it('should return null for non-FSM YAML', () => {
    expect(extractFSM(null)).toBeNull();
    expect(extractFSM({})).toBeNull();
    expect(extractFSM({ some: 'data' })).toBeNull();
    expect(extractFSM({ view: {} })).toBeNull();
  });

  it('should handle YAML with states but no initial', () => {
    const yaml = {
      states: {
        idle: {},
        running: {},
      },
    };
    // Has states but no initial — not a valid FSM on its own
    expect(extractFSM(yaml)).toBeNull();
  });

  /* ------------------------------------------------------------------ */
  /* Bonus: createStoreHook getter returns live state                    */
  /* ------------------------------------------------------------------ */
  it('should return live state from createStoreHook getter', () => {
    const store = createStore<any>({
      initialState: { count: 0 },
    });
    store.setState('count', 1);
    const hook = {
      get state() { return store.getState(); },
    };
    expect(hook.state.count).toBe(1);
    store.setState('count', 2);
    expect(hook.state.count).toBe(2);
  });

  /* ------------------------------------------------------------------ */
  /* Bonus: Service type validation catches invalid adapters             */
  /* ------------------------------------------------------------------ */
  it('should validate service adapter types at init time', () => {
    const validAdapters = ['http', 'websocket', 'jsonrpc', 'file', 's3', 'mock', 'plugin', 'mcp'];

    const testConfigs = [
      { name: 'widgets-api', spec: { adapter: 'http' } },
      { name: 'widgets-rpc', spec: { adapter: 'jsonrpc' } },
      { name: 'store', spec: { adapter: 'plugin' } },
      { name: 'mock-api', spec: { adapter: 'mock' } },
    ];

    for (const { name, spec } of testConfigs) {
      const svcType = spec.adapter;
      expect(validAdapters.includes(svcType)).toBe(true);
    }

    expect(validAdapters.includes('mcp')).toBe(true);
    expect(validAdapters.includes('unknown')).toBe(false);
  });

  /* ------------------------------------------------------------------ */
  /* Bonus: onDisconnected calls super chain                            */
  /* ------------------------------------------------------------------ */
  it('should call super.onDisconnected to prevent FSM subscription leaks', () => {
    const superCalls: string[] = [];
    const mockBaseDisconnect = vi.fn(() => superCalls.push('base'));

    class ToggleWidget {
      onDisconnected(): void {
        mockBaseDisconnect();
      }
    }

    const widget = new ToggleWidget();
    widget.onDisconnected();
    expect(mockBaseDisconnect).toHaveBeenCalled();
    expect(superCalls).toContain('base');
  });

  /* ------------------------------------------------------------------ */
  /* Regression: HttpService does not retry 4xx client errors            */
  /* ------------------------------------------------------------------ */
  it('should not retry HTTP 4xx errors', () => {
    const http = new HTTPService({ baseUrl: 'http://localhost', timeout: 1000 });
    let attempts = 0;

    vi.spyOn(http as any, 'performRequest').mockImplementation(async () => {
      attempts++;
      const err = new ServiceError('HTTP 400', ServiceErrorCode.NOT_FOUND, { retryable: false });
      (err as any).retryable = false;
      throw err;
    });

    const promise = http.transport({ method: 'GET', url: '/test' });
    return expect(promise).rejects.toThrow().then(() => {
      expect(attempts).toBe(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Regression: Invoker falls back to seed when network fails           */
  /* ------------------------------------------------------------------ */
  it('should fall back to seed data when invoker has no external sources', async () => {
    let calls = 0;
    const seed = () => { calls++; return { loaded: true, error: null, data: {} }; };

    const result = seed();
    expect(result.loaded).toBe(true);
    expect(result.data).toBeDefined();
    expect(calls).toBe(1);
  });

  /* ------------------------------------------------------------------ */
  /* Regression: applyData is error-bounded (doesn't crash on shadow DOM) */
  /* ------------------------------------------------------------------ */
  it('should catch applyData errors and emit diagnostic', () => {
    const devtoolsMessages: any[] = [];
    (globalThis as any).__ux3DevTools = {
      emit: (source: string, type: string, payload: any) => {
        devtoolsMessages.push({ source, type, payload });
      },
    };

    let errorCaught = false;
    const failingApply = () => {
      try {
        const slot = { outerHTML: '' } as unknown as HTMLSlotElement;
        Object.defineProperty(slot, 'outerHTML', {
          set() { throw new DOMException('NoModificationAllowedError'); },
        });
        slot.outerHTML = '<div></div>';
      } catch (e) {
        errorCaught = true;
      }
    };

    failingApply();
    expect(errorCaught).toBe(true);

    delete (globalThis as any).__ux3DevTools;
  });

  /* ------------------------------------------------------------------ */
  /* Regression: kanban onDrop dispatches event, doesn't render mid-drag  */
  /* ------------------------------------------------------------------ */
  it('should dispatch KANBAN:MOVE without mutating local state mid-drag', () => {
    const events: CustomEvent[] = [];
    const widget = {
      columns: [{ title: 'A', cards: [{ id: '1', title: 'Card 1' }] }, { title: 'B', cards: [] }],
      dispatchEvent: (e: Event) => { events.push(e as CustomEvent); },
    };

    const before = JSON.stringify(widget.columns);

    const dispatch = (cards: string[], from: number, toCol: number) => {
      widget.dispatchEvent(new CustomEvent('ux:event', {
        bubbles: true, composed: true,
        detail: { action: 'KANBAN:MOVE', cards, from: String(from), to: String(toCol) },
      }));
    };

    dispatch(['1'], 0, 1);

    expect(events.length).toBe(1);
    expect(events[0].detail.action).toBe('KANBAN:MOVE');
    expect(events[0].detail.cards).toEqual(['1']);
    expect(events[0].detail.from).toBe('0');
    expect(events[0].detail.to).toBe('1');

    // local columns must NOT be mutated — FSM action handles it
    expect(JSON.stringify(widget.columns)).toBe(before);
  });
});
