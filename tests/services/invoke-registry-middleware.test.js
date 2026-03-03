import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InvokeRegistry } from '../../src/services/invoke-registry.js';
describe('InvokeRegistry - Middleware Pipeline (Phase 1.3.2)', () => {
    let registry;
    let mockApp;
    let callCount;
    beforeEach(() => {
        callCount = 0;
        mockApp = {
            services: {
                api: {
                    async getUser(input) {
                        callCount++;
                        return { id: input?.id || 1, name: `User ${input?.id || 1}`, email: 'user@example.com' };
                    },
                    async getUserWithLog(input) {
                        callCount++;
                        console.log(`[API] Fetching user: ${input?.id}`);
                        return { id: input?.id || 1, name: `User ${input?.id || 1}` };
                    }
                },
                auth: {
                    async login(input) {
                        callCount++;
                        if (!input?.username || !input?.password) {
                            throw new Error('Missing credentials');
                        }
                        return { token: 'auth-token', user: input.username };
                    }
                }
            }
        };
        registry = new InvokeRegistry(mockApp);
    });
    afterEach(() => {
        registry.clear();
        registry.clearMiddleware();
    });
    describe('Pre-Middleware', () => {
        it('should execute pre-middleware before invoke', async () => {
            const preEvents = [];
            const preMiddleware = async (context) => {
                preEvents.push('before');
                return {};
            };
            registry.usePreMiddleware(preMiddleware);
            await registry.executeServiceInvoke({ service: 'api', method: 'getUser', input: { id: 1 } });
            expect(preEvents).toContain('before');
            expect(callCount).toBe(1);
        });
        it('should allow pre-middleware to transform input', async () => {
            const preMiddleware = async (context, invoke) => {
                return {
                    input: { ...invoke.input, transformed: true, id: 999 }
                };
            };
            registry.usePreMiddleware(preMiddleware);
            const result = await registry.executeServiceInvoke({ service: 'api', method: 'getUser', input: { id: 1 } });
            expect(result.data.id).toBe(999);
        });
        it('should allow pre-middleware to skip execution', async () => {
            const preMiddleware = async (context) => {
                return {
                    skip: true,
                    result: {
                        success: true,
                        data: { cached: true },
                        duration: 0,
                        retries: 0,
                        timestamp: Date.now()
                    }
                };
            };
            registry.usePreMiddleware(preMiddleware);
            const result = await registry.executeServiceInvoke({ service: 'api', method: 'getUser', input: { id: 1 } });
            expect(result.data.cached).toBe(true);
            expect(callCount).toBe(0); // Service not called
        });
        it('should execute multiple pre-middlewares in order', async () => {
            const order = [];
            const middleware1 = async () => {
                order.push(1);
                return {};
            };
            const middleware2 = async () => {
                order.push(2);
                return {};
            };
            registry.usePreMiddleware(middleware1);
            registry.usePreMiddleware(middleware2);
            await registry.executeServiceInvoke({ service: 'api', method: 'getUser' });
            expect(order).toEqual([1, 2]);
        });
        it('should pass correct context to pre-middleware', async () => {
            let middlewareContext;
            const preMiddleware = async (context) => {
                middlewareContext = context;
                return {};
            };
            registry.usePreMiddleware(preMiddleware);
            await registry.executeServiceInvoke({ service: 'api', method: 'getUser', input: { id: 5 } });
            expect(middlewareContext.service).toBe('api');
            expect(middlewareContext.method).toBe('getUser');
            expect(middlewareContext.type).toBe('service');
            expect(middlewareContext.input.id).toBe(5);
        });
    });
    describe('Post-Middleware', () => {
        it('should execute post-middleware after successful invoke', async () => {
            const postEvents = [];
            const postMiddleware = async (context, result) => {
                postEvents.push('after');
                return result;
            };
            registry.usePostMiddleware(postMiddleware);
            await registry.executeServiceInvoke({ service: 'api', method: 'getUser' });
            expect(postEvents).toContain('after');
        });
        it('should allow post-middleware to transform result', async () => {
            const postMiddleware = async (context, result) => {
                return {
                    ...result,
                    data: { ...result.data, transformed: true }
                };
            };
            registry.usePostMiddleware(postMiddleware);
            const result = await registry.executeServiceInvoke({ service: 'api', method: 'getUser' });
            expect(result.data.transformed).toBe(true);
        });
        it('should execute multiple post-middlewares in order', async () => {
            const order = [];
            const middleware1 = async (context, result) => {
                order.push(1);
                return result;
            };
            const middleware2 = async (context, result) => {
                order.push(2);
                return result;
            };
            registry.usePostMiddleware(middleware1);
            registry.usePostMiddleware(middleware2);
            await registry.executeServiceInvoke({ service: 'api', method: 'getUser' });
            expect(order).toEqual([1, 2]);
        });
        it('should allow chaining transformations in post-middleware', async () => {
            const middleware1 = async (context, result) => {
                return {
                    ...result,
                    data: { ...result.data, step1: true }
                };
            };
            const middleware2 = async (context, result) => {
                return {
                    ...result,
                    data: { ...result.data, step2: true }
                };
            };
            registry.usePostMiddleware(middleware1);
            registry.usePostMiddleware(middleware2);
            const result = await registry.executeServiceInvoke({ service: 'api', method: 'getUser' });
            expect(result.data.step1).toBe(true);
            expect(result.data.step2).toBe(true);
        });
    });
    describe('Error Middleware', () => {
        it('should execute error middleware on invoke failure', async () => {
            const errorEvents = [];
            const errorMiddleware = async (context, error, retry) => {
                errorEvents.push('error');
                return {
                    success: false,
                    error,
                    duration: 0,
                    retries: 0,
                    timestamp: Date.now()
                };
            };
            registry.useErrorMiddleware(errorMiddleware);
            const result = await registry.executeServiceInvoke({ service: 'auth', method: 'login', input: {} }, undefined, { maxRetries: 0 });
            expect(result.success).toBe(false);
            expect(errorEvents).toContain('error');
        });
        it('should allow error middleware to recover from error', async () => {
            const errorMiddleware = async (context, error) => {
                return {
                    success: true,
                    data: { recovered: true },
                    duration: 0,
                    retries: 0,
                    timestamp: Date.now()
                };
            };
            registry.useErrorMiddleware(errorMiddleware);
            const result = await registry.executeServiceInvoke({ service: 'auth', method: 'login', input: {} }, undefined, { maxRetries: 0 });
            expect(result.success).toBe(true);
            expect(result.data.recovered).toBe(true);
        });
        it('should allow error middleware to retry invoke', async () => {
            let attempts = 0;
            const retryApp = {
                services: {
                    flaky: {
                        async operation() {
                            attempts++;
                            if (attempts < 2) {
                                throw new Error('First attempt fails');
                            }
                            return { success: true };
                        }
                    }
                }
            };
            const retryRegistry = new InvokeRegistry(retryApp);
            const errorMiddleware = async (context, error, retry) => {
                // Retry the operation
                return await retry();
            };
            retryRegistry.useErrorMiddleware(errorMiddleware);
            const result = await retryRegistry.executeServiceInvoke({ service: 'flaky', method: 'operation' }, undefined, { maxRetries: 1 });
            expect(result.success).toBe(true);
            expect(attempts).toBe(2); // Called twice (fail, retry, succeed)
        });
        it('should execute multiple error middlewares in order', async () => {
            const order = [];
            const middleware1 = async (context, error) => {
                order.push(1);
                return {
                    success: false,
                    error,
                    duration: 0,
                    retries: 0,
                    timestamp: Date.now()
                };
            };
            const middleware2 = async (context, error) => {
                order.push(2);
                return {
                    success: false,
                    error,
                    duration: 0,
                    retries: 0,
                    timestamp: Date.now()
                };
            };
            registry.useErrorMiddleware(middleware1);
            registry.useErrorMiddleware(middleware2);
            await registry.executeServiceInvoke({ service: 'auth', method: 'login', input: {} }, undefined, { maxRetries: 0 });
            expect(order).toEqual([1, 2]);
        });
    });
    describe('Combined Middleware Pipeline', () => {
        it('should execute pre, post, and error middleware together', async () => {
            const pipeline = [];
            const preMiddleware = async () => {
                pipeline.push('pre');
                return {};
            };
            const postMiddleware = async (context, result) => {
                pipeline.push('post');
                return result;
            };
            registry.usePreMiddleware(preMiddleware);
            registry.usePostMiddleware(postMiddleware);
            await registry.executeServiceInvoke({ service: 'api', method: 'getUser' });
            expect(pipeline).toEqual(['pre', 'post']);
        });
        it('should skip error middleware when invoke succeeds', async () => {
            const errorCalls = [];
            const errorMiddleware = async () => {
                errorCalls.push(1);
                return {
                    success: false,
                    error: new Error(''),
                    duration: 0,
                    retries: 0,
                    timestamp: Date.now()
                };
            };
            registry.useErrorMiddleware(errorMiddleware);
            await registry.executeServiceInvoke({ service: 'api', method: 'getUser' });
            expect(errorCalls).toHaveLength(0); // No error calls
        });
        it('should execute error middleware only on failure', async () => {
            const errorCalls = [];
            const errorMiddleware = async () => {
                errorCalls.push(1);
                return {
                    success: false,
                    error: new Error(''),
                    duration: 0,
                    retries: 0,
                    timestamp: Date.now()
                };
            };
            registry.useErrorMiddleware(errorMiddleware);
            await registry.executeServiceInvoke({ service: 'auth', method: 'login', input: {} }, undefined, { maxRetries: 0 });
            expect(errorCalls.length).toBeGreaterThan(0);
        });
    });
    describe('Middleware Clearing', () => {
        it('should clear all middleware when clearMiddleware() called', async () => {
            const events = [];
            const preMiddleware = async () => {
                events.push('pre');
                return {};
            };
            registry.usePreMiddleware(preMiddleware);
            registry.clearMiddleware();
            await registry.executeServiceInvoke({ service: 'api', method: 'getUser' });
            expect(events).toHaveLength(0);
        });
    });
    describe('Middleware with Source Functions', () => {
        it('should apply middleware to source function invokes', async () => {
            const events = [];
            const preMiddleware = async () => {
                events.push('pre');
                return {};
            };
            registry.usePreMiddleware(preMiddleware);
            const myFunc = async () => ({ result: 'test' });
            await registry.executeInvoke({ src: myFunc });
            expect(events).toContain('pre');
        });
    });
    describe('Middleware Error Handling', () => {
        it('should handle error middleware throwing error', async () => {
            const errorMiddleware = async () => {
                throw new Error('Middleware error');
            };
            registry.useErrorMiddleware(errorMiddleware);
            // Should not throw, should handle gracefully
            const result = await registry.executeServiceInvoke({ service: 'auth', method: 'login', input: {} }, undefined, { maxRetries: 0 });
            expect(result.success).toBe(false);
        });
        it('should handle pre-middleware throwing error', async () => {
            const preMiddleware = async () => {
                throw new Error('Pre middleware error');
            };
            registry.usePreMiddleware(preMiddleware);
            // Should not throw, should handle gracefully
            const result = await registry.executeServiceInvoke({ service: 'api', method: 'getUser' });
            // Should fall through to normal execution
            expect(result.success).toBe(true);
        });
    });
});
//# sourceMappingURL=invoke-registry-middleware.test.js.map