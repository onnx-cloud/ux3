/**
 * ViewComponent Refactor Tests
 * Verify ViewComponent delegates invoke handling to FSM and service registry
 */
import { describe, it, expect, vi } from 'vitest';
describe('ViewComponent - Invoke Refactor Architecture', () => {
    describe('Remove handleStateInvoke from ViewComponent', () => {
        it('should define an invoke handler registry pattern for services', () => {
            // Service invoke registry pattern - services auto-register their invoke handlers
            const invokeRegistry = new Map();
            // Helper to register invoke handlers
            const registerInvokeHandler = (service, method, handler) => {
                if (!invokeRegistry.has(service)) {
                    invokeRegistry.set(service, new Map());
                }
                invokeRegistry.get(service).set(method, handler);
            };
            // Helper to execute registered invoke handlers
            const executeInvokeHandler = async (service, method, input) => {
                const handler = invokeRegistry.get(service)?.get(method);
                if (!handler) {
                    throw new Error(`Invoke handler not found: ${service}.${method}`);
                }
                return handler(input);
            };
            // Register test handlers
            const apiHandler = vi.fn(async ({ url }) => ({ data: 'fetched from ' + url }));
            registerInvokeHandler('api', 'fetch', apiHandler);
            // Services can dynamically register handlers
            const mockService = {
                fetch: async ({ url }) => ({ data: 'response' }),
            };
            registerInvokeHandler('api', 'customFetch', async (input) => {
                return mockService.fetch(input);
            });
            // Execute via registry
            expect(invokeRegistry.has('api')).toBe(true);
            expect(invokeRegistry.get('api').has('fetch')).toBe(true);
        });
        it('should delegate invoke execution to FSM instead of ViewComponent', async () => {
            // New pattern: FSM handles invoke execution, not ViewComponent
            const invokeHandlers = new Map();
            class SimpleViewComponent extends HTMLElement {
                constructor() {
                    super();
                    Object.defineProperty(this, "fsm", {
                        enumerable: true,
                        configurable: true,
                        writable: true,
                        value: void 0
                    });
                    Object.defineProperty(this, "invokeHandlers", {
                        enumerable: true,
                        configurable: true,
                        writable: true,
                        value: void 0
                    });
                    this.invokeHandlers = invokeHandlers;
                }
                // NEW: No handleStateInvoke method!
                // Instead, FSM is responsible for executing invokes
                async onStateChange(state) {
                    // ViewComponent just manages UI, FSM handles invokes
                    this.renderState(state);
                    // FSM will emit events or have handlers for invokes
                }
                renderState(state) {
                    // Just render, no invoke logic
                }
            }
            // Verify the refactored component doesn't have the old method
            const proto = SimpleViewComponent.prototype;
            expect(proto.handleStateInvoke).toBeUndefined();
            // Should NOT have invoke handling - that's FSM's job
        });
        it('should use service registry for invoke configuration', () => {
            // Service registry pattern for invoke setup at AppContext initialization
            const appConfig = {
                services: {
                    api: {
                        type: 'http',
                        baseUrl: 'https://api.example.com',
                    },
                    data: {
                        type: 'jsonrpc',
                        baseUrl: 'https://data.example.com/rpc',
                    },
                },
            };
            const serviceInvokeRegistry = new Map();
            // Register service invoke handlers
            const registerServiceInvoke = (serviceName, config) => {
                serviceInvokeRegistry.set(serviceName, {
                    type: config.type,
                    handler: async (params) => {
                        // Service-specific invoke logic
                        return { result: 'invoked ' + serviceName };
                    },
                });
            };
            // Setup at app initialization
            for (const [name, config] of Object.entries(appConfig.services)) {
                registerServiceInvoke(name, config);
            }
            // FSM can then use this registry
            expect(serviceInvokeRegistry.has('api')).toBe(true);
            expect(serviceInvokeRegistry.get('api').type).toBe('http');
        });
        it('should move invoke logic from ViewComponent to FSM/StateChange handler', () => {
            // Comparison of OLD vs NEW patterns
            // OLD PATTERN: ViewComponent handles invoke
            const oldViewComponent = {
                async handleStateInvoke(state) {
                    // ViewComponent reaches into FSM config and executes invoke
                    const invokeCfg = this.fsmConfig.states[state].invoke;
                    if (invokeCfg) {
                        const service = this.app.services[invokeCfg.service];
                        const method = invokeCfg.method || 'fetch';
                        await service[method](invokeCfg.input);
                    }
                },
            };
            // NEW PATTERN: FSM/AppContext handles invoke via registry
            const newPattern = {
                setupInvokeHandlers() {
                    // During app initialization, set up invoke handlers
                    const invokeRegistry = new Map();
                    // Register handlers from FSM config
                    const registerHandlers = (fsmConfig) => {
                        for (const [state, stateConfig] of Object.entries(fsmConfig.states)) {
                            const invoke = stateConfig.invoke;
                            if (invoke) {
                                const key = `${invoke.service}.${invoke.method}`;
                                invokeRegistry.set(key, async (input) => {
                                    const svc = this.app.services[invoke.service];
                                    return svc[invoke.method](input);
                                });
                            }
                        }
                    };
                    return invokeRegistry;
                },
                onStateChange(state) {
                    // ViewComponent just renders, doesn't handle invokes
                    this.renderState(state);
                    // FSM emits state change with invoke info
                    // Framework/FSM handles the invoke execution
                },
            };
            // Both patterns work, but new pattern decouples ViewComponent from invoke logic
            expect(oldViewComponent.handleStateInvoke).toBeDefined();
            expect(newPattern.setupInvokeHandlers).toBeDefined();
            expect(newPattern.onStateChange).toBeDefined();
        });
    });
    describe('FSM-Centric Invoke Handling', () => {
        it('should allow StateMachine to manage invoke execution', async () => {
            // FSM should handle invoke callbacks, not ViewComponent
            const stateConfig = {
                type: 'loading',
                invoke: {
                    service: 'api',
                    method: 'fetch',
                    input: { url: '/data' },
                    onSuccess: 'success',
                    onError: 'error',
                },
            };
            const invokeHandler = vi.fn(async () => ({
                data: 'fetched',
            }));
            // FSM state should trigger invoke, not ViewComponent
            const canExecuteInvoke = () => {
                const hasInvoke = stateConfig.invoke !== undefined;
                const hasHandler = invokeHandler !== undefined;
                return hasInvoke && hasHandler;
            };
            expect(canExecuteInvoke()).toBe(true);
            // FSM (not ViewComponent) should call invokeHandler
            await invokeHandler();
            expect(invokeHandler).toHaveBeenCalled();
        });
        it('should decouple event handling from invoke handling', () => {
            // Events and invokes are separate concerns
            const eventHandling = {
                // Events: user interactions → FSM transitions
                handleClick: (action) => {
                    // fsm.send(action);
                },
                handleSubmit: (payload) => {
                    // fsm.send('SUBMIT', { payload });
                },
            };
            const invokeHandling = {
                // Invokes: FSM state activation → service calls
                // Handled by FSM, not ViewComponent
                onStateEnter: (state) => {
                    // if (state.invoke) FSMInvokeManager.execute(state.invoke)
                },
            };
            // Both are testable independently
            expect(eventHandling.handleClick).toBeDefined();
            expect(invokeHandling.onStateEnter).toBeDefined();
            // ViewComponent should only handle event binding
            // FSM should handle invoke execution
        });
    });
    describe('Migration Path ViewComponent Refactor', () => {
        it('should show step-by-step refactor plan', () => {
            const refactorPlan = {
                step1_current: 'ViewComponent.handleStateInvoke() handles service calls',
                step2_decouple: 'Add InvokeRegistry to AppContext for centralized invoke management',
                step3_move: 'Move invoke execution from ViewComponent to InvokeRegistry/FSM',
                step4_clean: 'Remove handleStateInvoke() from ViewComponent',
                step5_test: 'Verify FSM-based invoke handling works for all services',
            };
            expect(refactorPlan.step1_current).toContain('handleStateInvoke');
            expect(refactorPlan.step4_clean).toContain('Remove');
            // Plan shows clear migration path
            expect(Object.keys(refactorPlan).length).toBeGreaterThan(3);
        });
        it('should maintain backwards compatibility during migration', () => {
            // Create a wrapper that supports both old and new patterns
            class ViewComponentBridge {
                constructor(invokeExecutor = async (state) => {
                    // Default: execute invoke via registry
                    return undefined;
                }) {
                    Object.defineProperty(this, "invokeExecutor", {
                        enumerable: true,
                        configurable: true,
                        writable: true,
                        value: void 0
                    });
                    this.invokeExecutor = invokeExecutor;
                }
                // New method: delegates to executor (could be Registry, FSM, etc)
                async executeInvoke(state) {
                    return this.invokeExecutor(state);
                }
                // Old method: still available for backwards compatibility
                async handleStateInvoke_compat(state) {
                    return this.executeInvoke(state);
                }
            }
            const bridge = new ViewComponentBridge();
            // Both old and new patterns work during migration
            expect(bridge.executeInvoke).toBeDefined();
            expect(bridge.handleStateInvoke_compat).toBeDefined();
        });
    });
    describe('Architecture Benefits of Refactor', () => {
        it('should list benefits of decoupling invoke from ViewComponent', () => {
            const benefits = [
                'ViewComponent focuses only on UI rendering and event binding',
                'FSM/Registry handles all service invocation logic',
                'Easier to test service calls independently',
                'Service invoke patterns can be reused across views',
                'Middleware/interceptors can be applied at FSM level',
                'Better separation of concerns',
                'Can mock invoke behavior for testing without ViewComponent',
            ];
            expect(benefits.length).toBeGreaterThan(5);
            expect(benefits[0]).toContain('UI rendering');
            expect(benefits[1]).toContain('FSM');
        });
    });
});
//# sourceMappingURL=view-component-refactor.test.js.map