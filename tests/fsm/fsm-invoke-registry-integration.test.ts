/**
 * Phase 1.2.3: FSM InvokeRegistry Integration Tests
 * 
 * Tests for FSM integration with InvokeRegistry for centralized service invocation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateMachine } from '../../src/fsm/state-machine.ts';
import { InvokeRegistry } from '../../src/services/invoke-registry.ts';
import type { AppContext } from '../../src/ui/app.ts';
import type { MachineConfig, InvokeService } from '../../src/fsm/types.ts';

/**
 * Create a mock AppContext for testing
 */
function createMockAppContext(): AppContext {
  return {
    styles: {},
    machines: {},
    services: {
      api: {
        async fetch(input: any) {
          return { success: true, data: input, userId: 123 };
        },
        async call(method: string, params?: any) {
          return { method, params, result: 'ok' };
        },
      } as any,
      db: {
        async fetch(input: any) {
          return { record: input, found: true };
        },
      } as any,
    },
    widgets: {} as any,
    ui: {},
    template: () => '',
    render: () => '',
    i18n: () => '',
    nav: null,
    config: {},
  };
}

describe('FSM InvokeRegistry Integration (Phase 1.2.3)', () => {
  let fsm: StateMachine<any>;
  let registry: InvokeRegistry;
  let mockApp: AppContext;

  beforeEach(() => {
    mockApp = createMockAppContext();
    registry = new InvokeRegistry(mockApp);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Basic Integration Tests
  // ============================================================================

  it('should register InvokeRegistry with FSM', () => {
    const config: MachineConfig<any> = {
      initial: 'idle',
      context: { data: null },
      states: {
        idle: {
          on: { FETCH: 'loading' }
        },
        loading: {
          invoke: {
            service: 'api',
            method: 'fetch',
            input: { url: '/users' }
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    expect(fsm).toBeDefined();
  });

  it('should execute service invoke via registry when in service state', async () => {
    const config: MachineConfig<any> = {
      initial: 'idle',
      context: { data: null },
      states: {
        idle: {
          on: { FETCH: 'loading' }
        },
        loading: {
          invoke: {
            service: 'api',
            method: 'fetch',
            input: { url: '/users' }
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    // Transition to loading state (which has invoke)
    fsm.send({ type: 'FETCH' });

    // Wait for async invoke to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fsm.getState()).toBe('done');
  });

  it('should update context with invoke result', async () => {
    const config: MachineConfig<any> = {
      initial: 'idle',
      context: { userId: null, name: null },
      states: {
        idle: {
          on: { FETCH: 'loading' }
        },
        loading: {
          invoke: {
            service: 'api',
            method: 'fetch',
            input: { url: '/users' }
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'FETCH' });

    await new Promise(resolve => setTimeout(resolve, 100));

    const context = fsm.getContext();
    expect(context.userId).toBe(123);
  });

  it('should transition to done on successful invoke', async () => {
    const config: MachineConfig<any> = {
      initial: 'idle',
      states: {
        idle: { on: { START: 'loading' } },
        loading: {
          invoke: {
            service: 'api',
            method: 'fetch',
            input: { url: '/data' }
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'START' });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fsm.getState()).toBe('done');
  });

  // ============================================================================
  // Retry Integration Tests
  // ============================================================================

  it('should retry failed invokes using registry retry logic', async () => {
    let attempts = 0;
    mockApp.services.flaky = {
      async fetch() {
        attempts++;
        if (attempts < 2) throw new Error('Temporary failure');
        return { success: true, attempts };
      }
    } as any;

    const config: MachineConfig<any> = {
      initial: 'idle',
      context: { attempts: 0 },
      states: {
        idle: { on: { START: 'loading' } },
        loading: {
          invoke: {
            service: 'flaky',
            method: 'fetch',
            maxRetries: 2
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'START' });

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(fsm.getState()).toBe('done');
    expect(attempts).toBeGreaterThan(1);
  });

  it('should transition to error on invoke failure', async () => {
    mockApp.services.broken = {
      async fetch() {
        throw new Error('Service broken');
      }
    } as any;

    const config: MachineConfig<any> = {
      initial: 'idle',
      states: {
        idle: { on: { START: 'loading' } },
        loading: {
          invoke: {
            service: 'broken',
            method: 'fetch',
            maxRetries: 0
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'START' });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fsm.getState()).toBe('error');
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  it('should execute errorActions on invoke failure', async () => {
    const errorActionSpy = vi.fn();

    mockApp.services.failing = {
      async fetch() {
        throw new Error('Service error');
      }
    } as any;

    const config: MachineConfig<any> = {
      initial: 'idle',
      context: { error: null },
      states: {
        idle: { on: { START: 'loading' } },
        loading: {
          invoke: {
            service: 'failing',
            method: 'fetch',
            maxRetries: 0
          },
          errorActions: [errorActionSpy],
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'START' });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(errorActionSpy).toHaveBeenCalled();
    expect(errorActionSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(Error));
  });

  it('should transition to errorTarget state on invoke failure', async () => {
    mockApp.services.error_service = {
      async fetch() {
        throw new Error('Request failed');
      }
    } as any;

    const config: MachineConfig<any> = {
      initial: 'idle',
      states: {
        idle: { on: { START: 'loading' } },
        loading: {
          invoke: {
            service: 'error_service',
            method: 'fetch',
            maxRetries: 0
          },
          errorTarget: 'handleError',
          on: {
            SUCCESS: 'done'
          }
        },
        done: {},
        handleError: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'START' });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fsm.getState()).toBe('handleError');
  });

  // ============================================================================
  // Multiple Service Invokes Tests
  // ============================================================================

  it('should handle invokes from multiple services', async () => {
    const config: MachineConfig<any> = {
      initial: 'idle',
      context: { apiData: null, dbData: null },
      states: {
        idle: { on: { FETCH_API: 'fetchingAPI' } },
        fetchingAPI: {
          invoke: {
            service: 'api',
            method: 'fetch',
            input: { url: '/users' }
          },
          on: {
            SUCCESS: 'fetchingDB',
            ERROR: 'error'
          }
        },
        fetchingDB: {
          invoke: {
            service: 'db',
            method: 'fetch',
            input: { table: 'users' }
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'FETCH_API' });

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(fsm.getState()).toBe('done');
  });

  // ============================================================================
  // Backwards Compatibility Tests
  // ============================================================================

  it('should fall back to local handlers when registry not set', async () => {
    let handlerCalled = false;

    const config: MachineConfig<any> = {
      initial: 'idle',
      context: { result: null },
      states: {
        idle: { on: { INVOKE: 'loading' } },
        loading: {
          invoke: {
            src: async () => {
              handlerCalled = true;
              return { data: 'local' };
            }
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    // Don't set registry - should use fallback

    fsm.send({ type: 'INVOKE' });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should still work with local handler
    expect(fsm.getState()).toBe('done');
  });

  it('should support registered invoke handlers without registry', async () => {
    const handlerFn = async (input: any) => ({ handled: true, ...input });

    const config: MachineConfig<any> = {
      initial: 'idle',
      states: {
        idle: { on: { INVOKE: 'loading' } },
        loading: {
          invoke: {
            src: 'myHandler',
            input: { test: 1 }
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.registerInvokeHandler('myHandler', handlerFn);

    fsm.send({ type: 'INVOKE' });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fsm.getState()).toBe('done');
  });

  // ============================================================================
  // Context Passing Tests
  // ============================================================================

  it('should pass FSM context to service invoke', async () => {
    const contextCapture: any = {};

    mockApp.services.contextual = {
      async fetch(input: any, context?: any) {
        contextCapture.input = input;
        contextCapture.context = context;
        return { success: true };
      }
    } as any;

    const config: MachineConfig<any> = {
      initial: 'idle',
      context: { userId: 42, sessionId: 'xyz' },
      states: {
        idle: { on: { START: 'loading' } },
        loading: {
          invoke: {
            service: 'contextual',
            method: 'fetch',
            input: { url: '/data' }
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'START' });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(contextCapture.context).toEqual({ userId: 42, sessionId: 'xyz' });
  });

  // ============================================================================
  // Monitoring/Observer Tests
  // ============================================================================

  it('should notify listeners of invoke events via registry', async () => {
    const events: string[] = [];

    registry.onInvoke((invoke) => {
      events.push(invoke.status);
    });

    const config: MachineConfig<any> = {
      initial: 'idle',
      states: {
        idle: { on: { START: 'loading' } },
        loading: {
          invoke: {
            service: 'api',
            method: 'fetch'
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'START' });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(events).toContain('start');
    expect(events).toContain('success');
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  it('should handle invoke without input', async () => {
    const config: MachineConfig<any> = {
      initial: 'idle',
      states: {
        idle: { on: { START: 'loading' } },
        loading: {
          invoke: {
            service: 'api',
            method: 'fetch'
            // no input property
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'START' });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fsm.getState()).toBe('done');
  });

  it('should handle states without invoke config', async () => {
    const config: MachineConfig<any> = {
      initial: 'idle',
      states: {
        idle: { 
          on: { START: 'running' }
        },
        running: {
          // no invoke config
          on: { DONE: 'done' }
        },
        done: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'START' });
    fsm.send({ type: 'DONE' });

    expect(fsm.getState()).toBe('done');
  });

  it('should handle service not found in registry', async () => {
    const config: MachineConfig<any> = {
      initial: 'idle',
      states: {
        idle: { on: { START: 'loading' } },
        loading: {
          invoke: {
            service: 'nonexistent',
            method: 'fetch',
            maxRetries: 0
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'START' });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fsm.getState()).toBe('error');
  });

  it('should support custom retry delay function', async () => {
    let attempts = 0;
    mockApp.services.delayed = {
      async fetch() {
        if (++attempts < 2) throw new Error('Try again');
        return { attempts };
      }
    } as any;

    const config: MachineConfig<any> = {
      initial: 'idle',
      states: {
        idle: { on: { START: 'loading' } },
        loading: {
          invoke: {
            service: 'delayed',
            method: 'fetch',
            maxRetries: 1,
            retryDelay: (attempt) => 10 // 10ms delay
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'START' });

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(fsm.getState()).toBe('done');
    expect(attempts).toBe(2);
  });

  it('should track statistics via registry', async () => {
    const config: MachineConfig<any> = {
      initial: 'idle',
      states: {
        idle: { on: { START: 'loading' } },
        loading: {
          invoke: {
            service: 'api',
            method: 'fetch'
          },
          on: {
            SUCCESS: 'done',
            ERROR: 'error'
          }
        },
        done: {},
        error: {}
      }
    };

    fsm = new StateMachine(config);
    fsm.setInvokeRegistry(registry);

    fsm.send({ type: 'START' });

    await new Promise(resolve => setTimeout(resolve, 100));

    const stats = registry.getStats('api', 'fetch');
    expect(stats).toBeDefined();
    expect(stats?.count).toBeGreaterThan(0);
  });
});
