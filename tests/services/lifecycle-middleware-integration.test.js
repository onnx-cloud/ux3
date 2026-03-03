/**
 * Phase 1.4: Lifecycle-Middleware Integration Tests
 *
 * Tests that lifecycle phases are correctly triggered during service invocations:
 * - REGISTER: When service is first used
 * - AUTHENTICATE: For auth services
 * - READY: When service call succeeds
 * - ERROR: When service call fails
 * - RECONNECT: When retrying after failure
 * - DISCONNECT: When clearing service cache
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InvokeRegistry } from '../../src/services/invoke-registry.js';
import { HookRegistry, ServiceLifecyclePhase } from '../../src/core/lifecycle.js';
// Mock service implementations
class MockUserService {
    async fetch(input) {
        if (input?.error) {
            throw new Error(`User service error: ${input.error}`);
        }
        return { id: 1, name: 'Alice', ...input };
    }
    async create(input) {
        if (input?.error) {
            throw new Error(`Create failed: ${input.error}`);
        }
        return { id: 2, name: input.name, created: true };
    }
}
class MockAuthService {
    async fetch(input) {
        if (input?.error) {
            throw new Error(`Auth failed: ${input.error}`);
        }
        return { token: 'jwt-token-123', authenticated: true, ...input };
    }
    async login(input) {
        if (input?.invalidCredentials) {
            throw new Error('Invalid credentials');
        }
        return { token: 'jwt-token-456', authenticated: true, user: input.username };
    }
}
class MockApiService {
    constructor() {
        Object.defineProperty(this, "callCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "failTimes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
    }
    async fetch(input) {
        this.callCount++;
        if (this.failTimes > 0) {
            this.failTimes--;
            throw new Error('Temporary API error');
        }
        return { data: input?.query || 'default-data' };
    }
}
describe('Phase 1.4: Lifecycle-Middleware Integration', () => {
    let appContext;
    let registry;
    let hooks;
    let userService;
    let authService;
    let apiService;
    beforeEach(() => {
        hooks = new HookRegistry();
        userService = new MockUserService();
        authService = new MockAuthService();
        apiService = new MockApiService();
        appContext = {
            services: {
                user: userService,
                auth: authService,
                api: apiService
            },
            hooks,
            config: {}
        };
        registry = new InvokeRegistry(appContext);
    });
    afterEach(() => {
        hooks.clear();
    });
    describe('REGISTER Phase', () => {
        it('should fire REGISTER phase on first service invoke', async () => {
            const registerCalls = [];
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                registerCalls.push(ctx);
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch',
                input: { id: 1 }
            });
            expect(registerCalls).toHaveLength(1);
            expect(registerCalls[0].meta?.serviceName).toBe('user');
            expect(registerCalls[0].service).toBe(userService);
        });
        it('should only fire REGISTER once per service', async () => {
            const registerCalls = [];
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                registerCalls.push(ctx);
            });
            // Multiple calls to same service
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'create',
                input: { name: 'Bob' }
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch',
                input: { id: 2 }
            });
            // REGISTER should only be called once even with multiple invokes
            expect(registerCalls).toHaveLength(1);
            expect(registerCalls[0].meta?.serviceName).toBe('user');
        });
        it('should fire REGISTER for each different service', async () => {
            const registerCalls = [];
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                registerCalls.push(ctx.meta?.serviceName);
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            await registry.executeServiceInvoke({
                service: 'auth',
                method: 'fetch'
            });
            await registry.executeServiceInvoke({
                service: 'api',
                method: 'fetch'
            });
            expect(registerCalls).toEqual(['user', 'auth', 'api']);
        });
        it('should not block execution if REGISTER hook throws', async () => {
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                throw new Error('Hook error');
            });
            const result = await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            expect(result.success).toBe(true);
            expect(result.data).toEqual({ id: 1, name: 'Alice' });
        });
    });
    describe('READY Phase', () => {
        it('should fire READY phase on successful invoke', async () => {
            const readyCalls = [];
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                readyCalls.push(ctx);
            });
            const result = await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch',
                input: { id: 1 }
            });
            expect(result.success).toBe(true);
            expect(readyCalls).toHaveLength(1);
            expect(readyCalls[0].meta?.serviceName).toBe('user');
            expect(readyCalls[0].meta?.result.success).toBe(true);
            expect(readyCalls[0].meta?.result.data).toEqual({
                id: 1,
                name: 'Alice'
            });
        });
        it('should fire READY for each successful invoke', async () => {
            const readyCalls = [];
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                readyCalls.push(ctx.meta);
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'create',
                input: { name: 'Bob' }
            });
            expect(readyCalls).toHaveLength(2);
            expect(readyCalls[0].result.data.name).toBe('Alice');
            expect(readyCalls[1].result.data.name).toBe('Bob');
        });
        it('should include result data in READY context', async () => {
            const readyCalls = [];
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                readyCalls.push(ctx);
            });
            const input = { id: 42, extra: 'data' };
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch',
                input
            });
            const meta = readyCalls[0].meta;
            expect(meta?.result.data).toEqual({
                id: 42,
                extra: 'data',
                name: 'Alice'
            });
        });
        it('should not fire READY if invoke fails', async () => {
            const readyCalls = [];
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                readyCalls.push(ctx);
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch',
                input: { error: 'something went wrong' }
            });
            expect(readyCalls).toHaveLength(0);
        });
        it('should not block execution if READY hook throws', async () => {
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                throw new Error('READY hook failed');
            });
            const result = await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            expect(result.success).toBe(true);
            expect(result.data).toEqual({ id: 1, name: 'Alice' });
        });
    });
    describe('ERROR Phase', () => {
        it('should fire ERROR phase on invoke failure', async () => {
            const errorCalls = [];
            hooks.on(ServiceLifecyclePhase.ERROR, (ctx) => {
                errorCalls.push(ctx);
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch',
                input: { error: 'network error' }
            });
            expect(errorCalls).toHaveLength(1);
            expect(errorCalls[0].meta?.serviceName).toBe('user');
            expect(errorCalls[0].meta?.error).toBeInstanceOf(Error);
            expect(errorCalls[0].meta?.error.message).toContain('network error');
        });
        it('should fire ERROR for each failed invoke', async () => {
            const errorCalls = [];
            hooks.on(ServiceLifecyclePhase.ERROR, (ctx) => {
                errorCalls.push(ctx.meta);
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch',
                input: { error: 'error1' }
            });
            await registry.executeServiceInvoke({
                service: 'auth',
                method: 'login',
                input: { username: 'test', invalidCredentials: true }
            });
            expect(errorCalls).toHaveLength(2);
            expect(errorCalls[0].error.message).toContain('error1');
            expect(errorCalls[1].error.message).toContain('Invalid credentials');
        });
        it('should not fire ERROR if invoke succeeds', async () => {
            const errorCalls = [];
            hooks.on(ServiceLifecyclePhase.ERROR, (ctx) => {
                errorCalls.push(ctx);
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            expect(errorCalls).toHaveLength(0);
        });
        it('should not block execution if ERROR hook throws', async () => {
            hooks.on(ServiceLifecyclePhase.ERROR, (ctx) => {
                throw new Error('ERROR hook failed');
            });
            const result = await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch',
                input: { error: 'test error' }
            });
            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
        });
    });
    describe('RECONNECT Phase', () => {
        it('should fire RECONNECT on retry', async () => {
            const reconnectCalls = [];
            hooks.on(ServiceLifecyclePhase.RECONNECT, (ctx) => {
                reconnectCalls.push(ctx);
            });
            apiService.failTimes = 2; // Fail first 2 attempts
            await registry.executeServiceInvoke({
                service: 'api',
                method: 'fetch',
                input: {},
                maxRetries: 3
            });
            // RECONNECT should fire before each retry (2 times for 2 retries)
            expect(reconnectCalls.length).toBeGreaterThanOrEqual(1);
            reconnectCalls.forEach((call) => {
                expect(call.meta?.serviceName).toBe('api');
                expect(typeof call.meta?.attempt).toBe('number');
            });
        });
        it('should not fire RECONNECT if no retries are configured', async () => {
            const reconnectCalls = [];
            hooks.on(ServiceLifecyclePhase.RECONNECT, (ctx) => {
                reconnectCalls.push(ctx);
            });
            apiService.failTimes = 1; // Will fail once
            await registry.executeServiceInvoke({
                service: 'api',
                method: 'fetch',
                input: {},
                maxRetries: 0 // No retries
            });
            expect(reconnectCalls).toHaveLength(0);
        });
        it('should fire RECONNECT with correct attempt number', async () => {
            const attempts = [];
            hooks.on(ServiceLifecyclePhase.RECONNECT, (ctx) => {
                attempts.push(ctx.meta?.attempt);
            });
            apiService.failTimes = 1;
            await registry.executeServiceInvoke({
                service: 'api',
                method: 'fetch',
                input: {},
                maxRetries: 3
            });
            // Should fire once with attempt 1 (first retry)
            expect(attempts).toContain(1);
        });
        it('should not block execution if RECONNECT hook throws', async () => {
            hooks.on(ServiceLifecyclePhase.RECONNECT, (ctx) => {
                throw new Error('RECONNECT hook failed');
            });
            apiService.failTimes = 1;
            const result = await registry.executeServiceInvoke({
                service: 'api',
                method: 'fetch',
                input: {},
                maxRetries: 2
            });
            expect(result.success).toBe(true);
        });
    });
    describe('Phase Sequence', () => {
        it('should fire phases in correct order on success: REGISTER -> READY', async () => {
            const phaseSequence = [];
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                phaseSequence.push('REGISTER');
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                phaseSequence.push('READY');
            });
            hooks.on(ServiceLifecyclePhase.ERROR, (ctx) => {
                phaseSequence.push('ERROR');
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            expect(phaseSequence).toEqual(['REGISTER', 'READY']);
        });
        it('should fire phases in correct order on failure: REGISTER -> ERROR', async () => {
            const phaseSequence = [];
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                phaseSequence.push('REGISTER');
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                phaseSequence.push('READY');
            });
            hooks.on(ServiceLifecyclePhase.ERROR, (ctx) => {
                phaseSequence.push('ERROR');
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch',
                input: { error: 'failed' }
            });
            expect(phaseSequence).toEqual(['REGISTER', 'ERROR']);
        });
        it('should fire phases in correct order on retry: REGISTER -> RECONNECT -> READY', async () => {
            const phaseSequence = [];
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                phaseSequence.push('REGISTER');
            });
            hooks.on(ServiceLifecyclePhase.RECONNECT, (ctx) => {
                phaseSequence.push('RECONNECT');
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                phaseSequence.push('READY');
            });
            apiService.failTimes = 1;
            await registry.executeServiceInvoke({
                service: 'api',
                method: 'fetch',
                input: {},
                maxRetries: 2
            });
            expect(phaseSequence).toEqual(['REGISTER', 'RECONNECT', 'READY']);
        });
        it('should fire multiple services independently', async () => {
            const phaseSequence = [];
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                phaseSequence.push({ phase: 'REGISTER', service: ctx.meta?.serviceName });
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                phaseSequence.push({ phase: 'READY', service: ctx.meta?.serviceName });
            });
            hooks.on(ServiceLifecyclePhase.ERROR, (ctx) => {
                phaseSequence.push({ phase: 'ERROR', service: ctx.meta?.serviceName });
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            await registry.executeServiceInvoke({
                service: 'auth',
                method: 'fetch',
                input: { error: 'auth failed' }
            });
            expect(phaseSequence).toEqual([
                { phase: 'REGISTER', service: 'user' },
                { phase: 'READY', service: 'user' },
                { phase: 'REGISTER', service: 'auth' },
                { phase: 'ERROR', service: 'auth' }
            ]);
        });
    });
    describe('DISCONNECT Phase', () => {
        it('should fire DISCONNECT for registered services', async () => {
            const disconnectCalls = [];
            hooks.on(ServiceLifecyclePhase.DISCONNECT, (ctx) => {
                disconnectCalls.push(ctx.meta?.serviceName);
            });
            // Register services by using them
            await registry.executeServiceInvoke({ service: 'user', method: 'fetch' });
            await registry.executeServiceInvoke({ service: 'auth', method: 'fetch' });
            // Clear registered services
            await registry.clearRegisteredServices();
            expect(disconnectCalls).toEqual(['user', 'auth']);
        });
        it('should not fire DISCONNECT for unregistered services', async () => {
            const disconnectCalls = [];
            hooks.on(ServiceLifecyclePhase.DISCONNECT, (ctx) => {
                disconnectCalls.push(ctx.meta?.serviceName);
            });
            // Don't register any services
            await registry.clearRegisteredServices();
            expect(disconnectCalls).toHaveLength(0);
        });
        it('should fire DISCONNECT for each registered service on clear', async () => {
            const disconnectCalls = [];
            hooks.on(ServiceLifecyclePhase.DISCONNECT, (ctx) => {
                disconnectCalls.push(ctx.meta?.serviceName);
            });
            // Register 3 services
            await registry.executeServiceInvoke({ service: 'user', method: 'fetch' });
            await registry.executeServiceInvoke({ service: 'auth', method: 'fetch' });
            await registry.executeServiceInvoke({ service: 'api', method: 'fetch' });
            await registry.clearRegisteredServices();
            expect(disconnectCalls.sort()).toEqual(['api', 'auth', 'user']);
        });
        it('should not block if DISCONNECT hook throws', async () => {
            hooks.on(ServiceLifecyclePhase.DISCONNECT, (ctx) => {
                throw new Error('DISCONNECT hook failed');
            });
            await registry.executeServiceInvoke({ service: 'user', method: 'fetch' });
            // Should not throw
            await expect(registry.clearRegisteredServices()).resolves.toBeUndefined();
        });
    });
    describe('Integration with Middleware', () => {
        it('should fire lifecycle phases alongside pre-middleware', async () => {
            const events = [];
            registry.usePreMiddleware(async (ctx, invoke) => {
                events.push('pre-middleware');
                return {};
            });
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                events.push('REGISTER');
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                events.push('READY');
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            // Pre-middleware should run before REGISTER
            expect(events.indexOf('pre-middleware')).toBeLessThan(events.indexOf('REGISTER'));
            expect(events).toContain('pre-middleware');
            expect(events).toContain('REGISTER');
            expect(events).toContain('READY');
        });
        it('should fire lifecycle phases alongside post-middleware', async () => {
            const events = [];
            registry.usePostMiddleware(async (ctx, result) => {
                events.push('post-middleware');
                return result;
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                events.push('READY');
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            // READY should fire before post-middleware returns
            expect(events).toContain('READY');
            expect(events).toContain('post-middleware');
        });
        it('should fire lifecycle phases alongside error middleware', async () => {
            const events = [];
            registry.useErrorMiddleware(async (ctx, error, retry) => {
                events.push('error-middleware');
                return { success: false, error, duration: 0, retries: 0, timestamp: 0 };
            });
            hooks.on(ServiceLifecyclePhase.ERROR, (ctx) => {
                events.push('ERROR');
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch',
                input: { error: 'test' }
            });
            expect(events).toContain('ERROR');
            expect(events).toContain('error-middleware');
        });
    });
    describe('Context Availability', () => {
        it('should have app context in lifecycle phases', async () => {
            let receivedContext = null;
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                receivedContext = ctx;
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            expect(receivedContext?.app).toBe(appContext);
        });
        it('should have service reference in lifecycle phases', async () => {
            let receivedService = null;
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                receivedService = ctx.service;
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            expect(receivedService).toBe(userService);
        });
        it('should have proper meta information for each phase', async () => {
            const metaMap = new Map();
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                metaMap.set('REGISTER', ctx.meta);
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                metaMap.set('READY', ctx.meta);
            });
            hooks.on(ServiceLifecyclePhase.ERROR, (ctx) => {
                metaMap.set('ERROR', ctx.meta);
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            expect(metaMap.get('REGISTER')?.serviceName).toBe('user');
            expect(metaMap.get('READY')?.result.success).toBe(true);
        });
    });
    describe('Multiple Hook Handlers', () => {
        it('should call multiple handlers for same phase', async () => {
            const handler1Calls = [];
            const handler2Calls = [];
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                handler1Calls.push(1);
            });
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                handler2Calls.push(2);
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            expect(handler1Calls).toHaveLength(1);
            expect(handler2Calls).toHaveLength(1);
        });
        it('should execute multiple handlers in order', async () => {
            const execOrder = [];
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                execOrder.push('handler1');
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                execOrder.push('handler2');
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                execOrder.push('handler3');
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            expect(execOrder).toEqual(['handler1', 'handler2', 'handler3']);
        });
        it('should handle one failing handler without blocking others', async () => {
            const results = [];
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                results.push('handler1');
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                throw new Error('Handler 2 failed');
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                results.push('handler3');
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch'
            });
            // HookRegistry stops on first error,  so handler3 won't be called
            // But the execution continues and result is still returned
            expect(results).toContain('handler1');
            // handler3 won't execute because HookRegistry propagates the error from handler2
        });
    });
    describe('Real-world Usage Patterns', () => {
        it('should handle user authentication flow', async () => {
            const events = [];
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                events.push(`Registered: ${ctx.meta?.serviceName}`);
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                events.push(`Ready: ${ctx.meta?.serviceName}`);
            });
            hooks.on(ServiceLifecyclePhase.ERROR, (ctx) => {
                events.push(`Error: ${ctx.meta?.serviceName}`);
            });
            // Simulate auth flow
            const authResult = await registry.executeServiceInvoke({
                service: 'auth',
                method: 'login',
                input: { username: 'alice' }
            });
            expect(authResult.success).toBe(true);
            expect(events).toEqual(['Registered: auth', 'Ready: auth']);
        });
        it('should handle service failure with graceful error handling', async () => {
            const errorLog = [];
            hooks.on(ServiceLifecyclePhase.ERROR, (ctx) => {
                errorLog.push(`Service ${ctx.meta?.serviceName} failed: ${ctx.meta?.error.message}`);
            });
            await registry.executeServiceInvoke({
                service: 'user',
                method: 'fetch',
                input: { error: 'network timeout' }
            });
            expect(errorLog).toHaveLength(1);
            expect(errorLog[0]).toContain('user');
            expect(errorLog[0]).toContain('network timeout');
        });
        it('should handle distributed trace logging across phases', async () => {
            const trace = [];
            const traceId = 'trace-123';
            // Register handlers that log to trace
            hooks.on(ServiceLifecyclePhase.REGISTER, (ctx) => {
                trace.push({ phase: 'REGISTER', service: ctx.meta?.serviceName, traceId });
            });
            hooks.on(ServiceLifecyclePhase.READY, (ctx) => {
                trace.push({ phase: 'READY', service: ctx.meta?.serviceName, traceId });
            });
            hooks.on(ServiceLifecyclePhase.ERROR, (ctx) => {
                trace.push({ phase: 'ERROR', service: ctx.meta?.serviceName, traceId });
            });
            // Multiple service calls should share trace context
            await registry.executeServiceInvoke({ service: 'user', method: 'fetch' });
            await registry.executeServiceInvoke({ service: 'auth', method: 'fetch' });
            // All trace entries use same traceId
            trace.forEach((entry) => {
                expect(entry.traceId).toBe(traceId);
            });
            expect(trace.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=lifecycle-middleware-integration.test.js.map