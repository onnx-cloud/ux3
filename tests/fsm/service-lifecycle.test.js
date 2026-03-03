import { describe, it, expect, vi } from 'vitest';
import { StateMachine } from '../../src/fsm/state-machine';
describe('StateMachine - Service Lifecycle (v1.1)', () => {
    describe('Auto-Retry with Exponential Backoff', () => {
        it('should retry failed invokes with exponential backoff', async () => {
            const handler = vi.fn()
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Timeout'))
                .mockResolvedValueOnce({ data: 'success' });
            const config = {
                id: 'retry-test',
                initial: 'idle',
                context: { data: null, error: null },
                states: {
                    idle: {
                        on: { START: 'loading' }
                    },
                    loading: {
                        invoke: {
                            src: 'fetchData',
                            maxRetries: 2,
                            retryDelay: 10 // 10ms for fast test
                        },
                        on: {
                            SUCCESS: { target: 'loaded', actions: [(ctx, event) => { ctx.data = event.payload; }] },
                            ERROR: 'error'
                        }
                    },
                    loaded: {},
                    error: {
                        on: { RETRY: 'loading' }
                    }
                }
            };
            const fsm = new StateMachine(config);
            fsm.registerInvokeHandler('fetchData', handler);
            // Start the flow
            fsm.send('START');
            // Wait for retries to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            // Should have succeeded after retries
            expect(fsm.getState()).toBe('loaded');
            expect(handler).toHaveBeenCalledTimes(3); // Initial + 2 retries
            expect(fsm.getContext().data).toEqual({ data: 'success' });
        });
        it('should use custom retry delay function', async () => {
            const handler = vi.fn()
                .mockRejectedValueOnce(new Error('Error'))
                .mockResolvedValueOnce({ result: 'ok' });
            const delays = [];
            const config = {
                id: 'custom-delay-test',
                initial: 'idle',
                context: {},
                states: {
                    idle: { on: { GO: 'fetching' } },
                    fetching: {
                        invoke: {
                            src: 'fetch',
                            maxRetries: 1,
                            retryDelay: (attempt) => {
                                const delay = 50 + (attempt * 30); // Linear: 50ms, 80ms...
                                delays.push(delay);
                                return delay;
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
            const fsm = new StateMachine(config);
            fsm.registerInvokeHandler('fetch', handler);
            fsm.send('GO');
            await new Promise(resolve => setTimeout(resolve, 200));
            expect(fsm.getState()).toBe('done');
            expect(delays.length).toBe(1);
            expect(delays[0]).toBe(50); // Linear with attempt 0: 50 + (0 * 30) = 50
        });
        it('should exhaust retries and transition to errorTarget', async () => {
            const handler = vi.fn().mockRejectedValue(new Error('Persistent failure'));
            const config = {
                id: 'max-retries',
                initial: 'idle',
                context: { error: null },
                states: {
                    idle: { on: { START: 'loading' } },
                    loading: {
                        invoke: {
                            src: 'failService',
                            maxRetries: 2,
                            retryDelay: 5
                        },
                        errorTarget: 'error',
                        errorActions: [
                            (ctx, err) => {
                                // Note: errorActions run before errorContext is set
                                ctx.userHandledError = true;
                            }
                        ],
                        on: {
                            SUCCESS: 'loaded'
                        }
                    },
                    loaded: {},
                    error: { on: { RETRY: 'loading' } }
                }
            };
            const fsm = new StateMachine(config);
            fsm.registerInvokeHandler('failService', handler);
            fsm.send('START');
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(fsm.getState()).toBe('error');
            // The error action is called and updates the context
            const ctx = fsm.getContext();
            expect(ctx.userHandledError).toBe(true);
            // The StateMachine also sets error context with code and message
            expect(ctx.error.message).toBe('Persistent failure');
            expect(ctx.error.code).toBe('UNKNOWN_ERROR'); // Default code
            expect(handler).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });
        it('should allow manual retry from error state', async () => {
            let callCount = 0;
            const handler = vi.fn(async () => {
                callCount++;
                if (callCount < 3) {
                    throw new Error('Not yet');
                }
                return { status: 'ok' };
            });
            const config = {
                id: 'manual-retry',
                initial: 'idle',
                context: { callCount: 0 },
                states: {
                    idle: { on: { START: 'fetching' } },
                    fetching: {
                        invoke: { src: 'tryFetch', maxRetries: 0 },
                        errorTarget: 'error',
                        on: { SUCCESS: 'done' }
                    },
                    done: {},
                    error: {
                        on: { RETRY: 'fetching' }
                    }
                }
            };
            const fsm = new StateMachine(config);
            fsm.registerInvokeHandler('tryFetch', handler);
            fsm.send('START');
            await new Promise(r => setTimeout(r, 50));
            expect(fsm.getState()).toBe('error');
            fsm.send('RETRY'); // Manual retry
            await new Promise(r => setTimeout(r, 50));
            expect(fsm.getState()).toBe('error');
            fsm.send('RETRY'); // Second manual retry
            await new Promise(r => setTimeout(r, 50));
            expect(fsm.getState()).toBe('done');
        });
    });
    describe('Error Recovery with errorTarget', () => {
        it('should automatically transition to errorTarget on service error', async () => {
            const handler = vi.fn().mockRejectedValue(new Error('API down'));
            const config = {
                id: 'auto-error',
                initial: 'idle',
                context: {},
                states: {
                    idle: { on: { LOAD: 'loading' } },
                    loading: {
                        invoke: {
                            src: 'loadData',
                            maxRetries: 0
                        },
                        errorTarget: 'error',
                        on: { SUCCESS: 'loaded' }
                    },
                    loaded: {},
                    error: { on: { RETRY: 'loading', DISMISS: 'idle' } }
                }
            };
            const fsm = new StateMachine(config);
            fsm.registerInvokeHandler('loadData', handler);
            fsm.send('LOAD');
            await new Promise(r => setTimeout(r, 50));
            expect(fsm.getState()).toBe('error');
        });
        it('should execute errorActions before transitioning to errorTarget', async () => {
            const handler = vi.fn().mockRejectedValue(new Error('Connection refused'));
            const errorLog = [];
            const config = {
                id: 'error-actions',
                initial: 'idle',
                context: { log: errorLog },
                states: {
                    idle: { on: { START: 'fetching' } },
                    fetching: {
                        invoke: {
                            src: 'fetch',
                            maxRetries: 0
                        },
                        errorTarget: 'error',
                        errorActions: [
                            (ctx, err) => ctx.log.push(`Error caught: ${err.message}`),
                            (ctx, err) => ctx.log.push('Notifying user')
                        ],
                        on: { SUCCESS: 'done' }
                    },
                    done: {},
                    error: {}
                }
            };
            const fsm = new StateMachine(config);
            fsm.registerInvokeHandler('fetch', handler);
            fsm.send('START');
            await new Promise(r => setTimeout(r, 50));
            expect(errorLog).toEqual([
                'Error caught: Connection refused',
                'Notifying user'
            ]);
            expect(fsm.getState()).toBe('error');
        });
        it('should pass error context to error state', async () => {
            const handler = vi.fn().mockRejectedValue(Object.assign(new Error('Auth failed'), { code: 'UNAUTHORIZED' }));
            const config = {
                id: 'error-context',
                initial: 'idle',
                context: { error: null },
                states: {
                    idle: { on: { AUTH: 'authenticating' } },
                    authenticating: {
                        invoke: {
                            src: 'authenticate',
                            maxRetries: 0
                        },
                        errorTarget: 'authError',
                        errorActions: [
                            (ctx, err) => {
                                ctx.error = {
                                    message: err.message,
                                    code: err.code || 'UNKNOWN'
                                };
                            }
                        ],
                        on: { SUCCESS: 'authenticated' }
                    },
                    authenticated: {},
                    authError: { on: { RETRY: 'authenticating' } }
                }
            };
            const fsm = new StateMachine(config);
            fsm.registerInvokeHandler('authenticate', handler);
            fsm.send('AUTH');
            await new Promise(r => setTimeout(r, 50));
            const ctx = fsm.getContext();
            expect(ctx.error.message).toBe('Auth failed');
            expect(ctx.error.code).toBe('UNAUTHORIZED');
        });
        it('should allow concurrent event during slow invoke', async () => {
            const handler = vi.fn(async () => {
                await new Promise(r => setTimeout(r, 50));
                return { loaded: true };
            });
            const config = {
                id: 'async-invoke',
                initial: 'idle',
                context: { loaded: false },
                states: {
                    idle: { on: { START: 'loading', SKIP: 'skipped' } },
                    loading: {
                        invoke: {
                            src: 'delayedLoad',
                            maxRetries: 0
                        },
                        on: { SUCCESS: 'loaded' }
                    },
                    loaded: {},
                    skipped: {}
                }
            };
            const fsm = new StateMachine(config);
            fsm.registerInvokeHandler('delayedLoad', handler);
            fsm.send('START');
            expect(fsm.getState()).toBe('loading');
            // Send another event immediately - should be queued
            fsm.send('SKIP');
            // SKIP is not a valid transition from loading state, so it's ignored
            expect(fsm.getState()).toBe('loading');
            // Wait for the invoke to complete
            await new Promise(r => setTimeout(r, 100));
            // Should have loaded successfully
            expect(fsm.getState()).toBe('loaded');
            expect(fsm.getContext().loaded).toBe(true);
        });
    });
    describe('Service Lifecycle Hooks', () => {
        it('should register and call custom invoke handlers', async () => {
            const myService = vi.fn(async (input) => ({ result: input * 2 }));
            const config = {
                id: 'with-handler',
                initial: 'idle',
                context: { result: null },
                states: {
                    idle: { on: { CALC: 'calculating' } },
                    calculating: {
                        invoke: {
                            src: 'double',
                            input: 5,
                            maxRetries: 0
                        },
                        on: {
                            SUCCESS: {
                                target: 'done',
                                actions: [(ctx, evt) => ctx.result = evt.payload.result]
                            },
                            ERROR: 'error'
                        }
                    },
                    done: {},
                    error: {}
                }
            };
            const fsm = new StateMachine(config);
            fsm.registerInvokeHandler('double', myService);
            fsm.send('CALC');
            await new Promise(r => setTimeout(r, 50));
            expect(fsm.getState()).toBe('done');
            expect(fsm.getContext().result).toBe(10);
            expect(myService).toHaveBeenCalledWith(5, expect.any(Object));
        });
    });
    describe('Guard Methods', () => {
        it('should check if event can be handled with can()', () => {
            const config = {
                id: 'guards',
                initial: 'idle',
                context: { attempts: 0 },
                states: {
                    idle: {
                        on: {
                            START: 'running',
                            SKIP: { target: 'running', guard: (ctx) => ctx.attempts > 0 }
                        }
                    },
                    running: { on: { STOP: 'idle' } }
                }
            };
            const fsm = new StateMachine(config);
            // START always possible from idle
            expect(fsm.can('START')).toBe(true);
            // SKIP blocked by guard (attempts is 0)
            expect(fsm.can('SKIP')).toBe(false);
            // STOP not possible in idle
            expect(fsm.can('STOP')).toBe(false);
            fsm.send('START');
            // Now in running state
            expect(fsm.can('STOP')).toBe(true);
            expect(fsm.can('START')).toBe(false);
            // Unblock guard and go back to idle
            fsm.setState({ attempts: 1 });
            fsm.send('STOP');
            expect(fsm.can('SKIP')).toBe(true); // Now guard passes
        });
    });
});
//# sourceMappingURL=service-lifecycle.test.js.map