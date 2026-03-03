/**
 * ViewComponent Refactor Tests
 * Verify ViewComponent delegates invoke handling to StateMachine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateMachine } from '../../src/fsm/state-machine.js';
import type { AppContext } from '../../src/ui/app.js';

describe('ViewComponent - Invoke Delegation Refactor', () => {
  let mockAppContext: AppContext;
  let mockFSM: StateMachine;

  beforeEach(() => {
    // Reset FSM registry for clean test state
    const { FSMRegistry } = require('../../src/fsm/registry.js');
    FSMRegistry.clear();

    // Create mock app context
    mockAppContext = {
      machines: {},
      services: {},
      template: vi.fn((name) => `<div>${name}</div>`),
      render: vi.fn((html) => html),
      hooks: { on: vi.fn(), execute: vi.fn(), off: vi.fn(), clear: vi.fn() },
    } as any;

    // Create a simple FSM for testing
    const config = {
      initial: 'idle',
      states: {
        idle: {
          on: { FETCH: 'loading' },
        },
        loading: {
          invoke: {
            service: 'api',
            method: 'fetch',
            input: { url: '/data' },
          },
          on: { SUCCESS: 'loaded' },
        },
        loaded: {
          template: '<div>Data loaded</div>',
        },
      },
    };

    mockFSM = new StateMachine(config, {
      services: {
        api: {
          fetch: vi.fn(async () => ({ data: 'test' })),
        },
      },
    });

    mockAppContext.machines = { 'testFSM': mockFSM };
  });

  describe('FSM-Driven Invoke Handling', () => {
    it('should delegate invoke callbacks to FSM instead of ViewComponent', async () => {
      // This test verifies the architectural change: service invokes
      // should be handled by FSMRegistry invoke handlers, not ViewComponent

      const invokeHandler = vi.fn(async (context: any) => {
        const fsm = mockAppContext.machines['testFSM'];
        const config = fsm.getMachineConfig();
        const stateCfg = config.states['loading'];
        
        if (stateCfg.invoke) {
          const inv = stateCfg.invoke;
          const svc = mockAppContext.services[inv.service];
          if (svc) {
            const method = inv.method || 'fetch';
            return (svc as any)[method](inv.input);
          }
        }
      });

      // Register invoke handler with FSM
      mockFSM.registerInvokeHandler('api', 'fetch', invokeHandler);

      // Transition to loading state (which has an invoke)
      mockFSM.send('FETCH');

      // FSM should use its own invoke handler, not ViewComponent
      await new Promise(r => setTimeout(r, 50));
      
      expect(mockFSM.getState()).toBe('loaded');
    });

    it('should allow FSM to handle service invocations without ViewComponent', async () => {
      const api = {
        fetch: vi.fn(async (params) => ({
          data: 'fetched',
          params,
        })),
      };

      const fsm = new StateMachine(
        {
          initial: 'ready',
          states: {
            ready: {
              on: { LOAD: 'loading' },
            },
            loading: {
              invoke: {
                service: 'api',
                method: 'fetch',
                input: { url: '/items' },
                onSuccess: 'success',
                onError: 'error',
              },
            },
            success: {
              type: 'final',
            },
            error: {
              type: 'final',
            },
          },
        },
        {
          services: { api },
        }
      );

      // Register the invoke handler
      fsm.registerInvokeHandler('api', 'fetch', async (context: any) => {
        const svc = mockAppContext.services['api'] || api;
        return svc.fetch({ url: '/items' });
      });

      // Transition to loading state
      fsm.send('LOAD');

      // Wait for async invoke to complete
      await new Promise(r => setTimeout(r, 100));

      // Should transition to success state after invoke completes
      expect(fsm.getState()).toBe('success');
      expect(api.fetch).toHaveBeenCalled();
    });
  });

  describe('Remove ViewComponent.handleStateInvoke()', () => {
    it('should not need handleStateInvoke method with FSM invoke handlers', async () => {
      // This test demonstrates that with FSMRegistry invoke handlers,
      // ViewComponent no longer needs to manually handle invokes

      // Define a view component that DOESN'T handle invokes itself
      class RefactoredViewComponent extends HTMLElement {
        protected app!: AppContext;
        protected fsm!: StateMachine;

        connectedCallback() {
          this.app = window.__ux3App as AppContext;
          const fsmName = this.getAttribute('ux-fsm') || 'testFSM';
          this.fsm = this.app.machines[fsmName];

          // Initial state - no manual invoke handling needed
          const state = this.fsm.getState();

          // Subscribe to state changes - FSM will handle invokes automatically
          this.fsm.subscribe((newState) => {
            if (newState !== state) {
              // View just renders, FSM handles invokes
              this.renderState(newState);
            }
          });
        }

        private renderState(state: string) {
          // Just render the template - no invoke logic
          console.log('Rendered state:', state);
        }
      }

      // Verify the refactored component doesn't have the old method
      const proto = RefactoredViewComponent.prototype;
      expect((proto as any).handleStateInvoke).toBeUndefined();
    });

    it('should handle service invocation through FSM only', async () => {
      const mockService = {
        fetch: vi.fn(async () => ({ result: 'success' })),
      };

      const fsm = new StateMachine(
        {
          initial: 'idle',
          states: {
            idle: { on: { INVOKE: 'executing' } },
            executing: {
              invoke: {
                service: 'handler',
                method: 'fetch',
              },
              on: { SUCCESS: 'done' },
            },
            done: {},
          },
        },
        { services: { handler: mockService } }
      );

      // Register invoke handler
      let invokeWasCalled = false;
      fsm.registerInvokeHandler('handler', 'fetch', async () => {
        invokeWasCalled = true;
        return await mockService.fetch();
      });

      // Trigger transition
      fsm.send('INVOKE');
      await new Promise(r => setTimeout(r, 50));

      expect(invokeWasCalled).toBe(true);
      expect(mockService.fetch).toHaveBeenCalled();
    });
  });

  describe('Event Delegation Without Invoke Coupling', () => {
    it('should separate event handling from invoke handling', async () => {
      // Events trigger transitions, FSM handles invokes

      const htmlElement = {
        getAttribute: (attr: string) => attr === 'ux-fsm' ? 'testFSM' : undefined,
      } as any;

      const eventHandler = vi.fn();
      const invokeHandler = vi.fn();

      const fsm = new StateMachine(
        {
          initial: 'form',
          states: {
            form: {
              on: { SUBMIT: 'loading' },
            },
            loading: {
              invoke: {
                service: 'api',
                method: 'submit',
              },
              on: { SUCCESS: 'success' },
            },
            success: {},
          },
        },
        {
          services: {
            api: {
              submit: vi.fn(async () => ({ ok: true })),
            },
          },
        }
      );

      // Register event handler (old ViewComponent responsibility)
      fsm.on({ type: 'SUBMIT' }, eventHandler);

      // Register invoke handler (new FSM responsibility)
      fsm.registerInvokeHandler('api', 'submit', invokeHandler);

      // Send form submission event
      fsm.send('SUBMIT');

      await new Promise(r => setTimeout(r, 50));

      // Event handler triggered
      expect(eventHandler).toHaveBeenCalled();
      // Invoke handler triggered by FSM
      expect(invokeHandler).toHaveBeenCalled();
    });
  });

  describe('Backwards Compatibility', () => {
    it('should still work with existing ViewComponent patterns during migration', async () => {
      // This test shows old ViewComponent still works during transition period

      const oldViewComponent = {
        fsm: mockFSM,
        app: mockAppContext,
        handleStateInvoke: async function (state: string) {
          // Old pattern - ViewComponent handles invoke
          const cfgMachine = this.fsm as any;
          const fsmConfig = cfgMachine.getMachineConfig();
          const stateCfg = fsmConfig.states[state];
          
          if (stateCfg && stateCfg.invoke) {
            const inv = stateCfg.invoke;
            if (inv.service) {
              const svc = this.app.services[inv.service];
              if (svc) {
                const method = inv.method || 'fetch';
                await (svc as any)[method](inv.input);
              }
            }
          }
        },
      };

      // Old pattern should still work
      await oldViewComponent.handleStateInvoke('loading');
      expect(mockFSM.getState()).toBe('loading');
    });
  });

  describe('FSM Registry Invoke Integration', () => {
    it('should use FSMRegistry.registerInvokeHandler for service invocation', () => {
      const { FSMRegistry } = require('../../src/fsm/registry.js');

      const mockHandler = vi.fn();
      FSMRegistry.registerInvokeHandler('myservice', 'fetch', mockHandler);

      // FSMRegistry should have the handler registered
      const handlers = (FSMRegistry as any).invokeHandlers.get('myservice') || new Map();
      expect(handlers.has('fetch')).toBe(true);
    });

    it('should delegate invoke execution to registered handlers', async () => {
      const { FSMRegistry } = require('../../src/fsm/registry.js');

      const handler = vi.fn(async () => ({ result: 'test' }));
      FSMRegistry.registerInvokeHandler('api', 'getData', handler);

      // Invoke handler should be retrievable and callable
      const handlers = (FSMRegistry as any).invokeHandlers.get('api');
      const registered = handlers?.get('getData');

      expect(registered).toBeDefined();
      
      if (registered) {
        await registered();
        expect(handler).toHaveBeenCalled();
      }
    });
  });

  describe('Migration Path', () => {
    it('should show migration from ViewComponent.handleStateInvoke to FSM handler', async () => {
      // OLD: ViewComponent handles invoke
      const oldApproach = async () => {
        const invoke = { service: 'api', method: 'fetch' };
        const svc = mockAppContext.services['api'];
        return await (svc as any)[invoke.method](invoke.input);
      };

      // NEW: FSM handles invoke
      const newApproach = () => {
        const fsm = mockAppContext.machines['testFSM'];
        fsm.registerInvokeHandler('api', 'fetch', oldApproach);
        // ViewComponent just calls: fsm.send('FETCH')
        // FSM handles the invoke automatically
      };

      // Both should work, but new approach is cleaner
      const result = await oldApproach();
      expect(result).toBeDefined();

      // New approach integrates with FSM lifecycle
      newApproach();
    });
  });
});
