/**
 * Request/Response Middleware Tests
 * Comprehensive middleware architecture testing
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loggingMiddleware, timeoutWarningMiddleware, requestMutationMiddleware, headerAugmentationMiddleware, retryMiddleware, circuitBreakerMiddleware, composeMiddleware, productionMiddlewareStack, developmentMiddlewareStack, } from '../../src/services/middleware.js';
describe('Service Middleware System', () => {
    let consoleSpy;
    beforeEach(() => {
        // Mock console methods to verify logging
        consoleSpy = {
            log: vi.spyOn(console, 'log').mockImplementation(() => { }),
            warn: vi.spyOn(console, 'warn').mockImplementation(() => { }),
            error: vi.spyOn(console, 'error').mockImplementation(() => { }),
            debug: vi.spyOn(console, 'debug').mockImplementation(() => { }),
        };
    });
    afterEach(() => {
        consoleSpy.log.mockRestore();
        consoleSpy.warn.mockRestore();
        consoleSpy.error.mockRestore();
        consoleSpy.debug.mockRestore();
    });
    describe('Logging Middleware', () => {
        it('should log successful HTTP requests', async () => {
            const middleware = loggingMiddleware('[TEST]');
            const request = {
                method: 'GET',
                baseUrl: 'https://api.test.com/users',
            };
            const mockNext = vi.fn(async () => ({
                method: 'GET',
                status: 200,
                data: { id: 1 },
                ok: true,
            }));
            const response = await middleware(request, mockNext);
            expect(response.status).toBe(200);
            expect(mockNext).toHaveBeenCalledWith(request);
            expect(consoleSpy.log).toHaveBeenCalled();
            expect(consoleSpy.log.mock.calls[0][0]).toContain('[TEST]');
            expect(consoleSpy.log.mock.calls[0][0]).toContain('GET');
            expect(consoleSpy.log.mock.calls[0][0]).toContain('200');
        });
        it('should log errors in requests', async () => {
            const middleware = loggingMiddleware('[ERROR]');
            const request = { method: 'POST', baseUrl: 'https://api.test.com' };
            const mockError = new Error('Network error');
            const mockNext = vi.fn(async () => {
                throw mockError;
            });
            await expect(middleware(request, mockNext)).rejects.toThrow('Network error');
            expect(consoleSpy.error).toHaveBeenCalled();
            expect(consoleSpy.error.mock.calls[0][0]).toContain('[ERROR]');
            expect(consoleSpy.error.mock.calls[0][0]).toContain('ERROR');
        });
        it('should measure request duration', async () => {
            const middleware = loggingMiddleware('[DURATION]');
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const mockNext = vi.fn(async () => {
                await new Promise(r => setTimeout(r, 50));
                return { method: 'GET', status: 200, data: {}, ok: true };
            });
            await middleware(request, mockNext);
            const logCall = consoleSpy.log.mock.calls[0][0];
            expect(logCall).toContain('ms');
            // Duration should be >= 50ms
            expect(parseInt(logCall.match(/(\d+)ms/)[1])).toBeGreaterThanOrEqual(50);
        });
    });
    describe('Timeout Warning Middleware', () => {
        it('should warn on requests exceeding threshold', async () => {
            const middleware = timeoutWarningMiddleware(100); // 100ms threshold
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const mockNext = vi.fn(async () => {
                await new Promise(r => setTimeout(r, 150)); // 150ms delay
                return { method: 'GET', status: 200, data: {}, ok: true };
            });
            await middleware(request, mockNext);
            expect(consoleSpy.warn).toHaveBeenCalled();
            const warnCall = consoleSpy.warn.mock.calls[0][0];
            expect(warnCall).toContain('Slow request');
            // Duration should be >= 150ms (within reasonable timing variance)
            const durationMatch = warnCall.match(/took (\d+)ms/);
            expect(durationMatch).toBeTruthy();
            expect(parseInt(durationMatch[1])).toBeGreaterThanOrEqual(140);
        });
        it('should not warn on requests under threshold', async () => {
            const middleware = timeoutWarningMiddleware(200);
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const mockNext = vi.fn(async () => {
                await new Promise(r => setTimeout(r, 50)); // 50ms delay
                return { method: 'GET', status: 200, data: {}, ok: true };
            });
            await middleware(request, mockNext);
            expect(consoleSpy.warn).not.toHaveBeenCalled();
        });
    });
    describe('Request Mutation Middleware', () => {
        it('should detect when requests are mutated', async () => {
            const middleware = requestMutationMiddleware();
            const request = {
                method: 'GET',
                baseUrl: 'https://api.test.com',
                headers: {},
            };
            const mockNext = vi.fn(async (req) => {
                // Mutate the request
                req.headers['X-Custom'] = 'value';
                req.method = 'POST';
                return { method: 'GET', status: 200, data: {}, ok: true };
            });
            await middleware(request, mockNext);
            expect(consoleSpy.debug).toHaveBeenCalled();
            const debugCall = consoleSpy.debug.mock.calls[0][0];
            expect(debugCall).toContain('mutated');
        });
        it('should not warn when requests are not mutated', async () => {
            const middleware = requestMutationMiddleware();
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const mockNext = vi.fn(async () => ({
                method: 'GET',
                status: 200,
                data: {},
                ok: true,
            }));
            await middleware(request, mockNext);
            expect(consoleSpy.debug).not.toHaveBeenCalled();
        });
    });
    describe('Header Augmentation Middleware', () => {
        it('should add custom headers to requests', async () => {
            const middleware = headerAugmentationMiddleware((request) => ({
                'X-Request-ID': 'req-123',
                'X-API-Version': '2.0',
            }));
            const request = {
                method: 'GET',
                baseUrl: 'https://api.test.com',
                headers: { 'Content-Type': 'application/json' },
            };
            const capturedRequest = {};
            const mockNext = vi.fn(async (req) => {
                Object.assign(capturedRequest, req);
                return { method: 'GET', status: 200, data: {}, ok: true };
            });
            await middleware(request, mockNext);
            expect(capturedRequest.headers['X-Request-ID']).toBe('req-123');
            expect(capturedRequest.headers['X-API-Version']).toBe('2.0');
            expect(capturedRequest.headers['Content-Type']).toBe('application/json'); // Original preserved
        });
    });
    describe('Retry Middleware', () => {
        it('should retry failed requests with exponential backoff', async () => {
            const middleware = retryMiddleware(3, 50); // 3 retries, 50ms initial
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            let attempt = 0;
            const mockNext = vi.fn(async () => {
                attempt++;
                if (attempt < 3) {
                    throw new Error('Temporary failure');
                }
                return { method: 'GET', status: 200, data: {}, ok: true };
            });
            const response = await middleware(request, mockNext);
            expect(response.status).toBe(200);
            expect(mockNext).toHaveBeenCalledTimes(3); // Called 3 times (2 failures + 1 success)
        });
        it('should fail after max retries exceeded', async () => {
            const middleware = retryMiddleware(2, 50);
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const mockNext = vi.fn(async () => {
                throw new Error('Permanent failure');
            });
            await expect(middleware(request, mockNext)).rejects.toThrow('Permanent failure');
            expect(mockNext).toHaveBeenCalledTimes(2); // Called 2 times (both failed)
        });
    });
    describe('Circuit Breaker Middleware', () => {
        it('should open circuit after repeated failures', async () => {
            const middleware = circuitBreakerMiddleware(2, 1000); // 2 failures to open
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const mockNext = vi.fn(async () => {
                throw new Error('Service down');
            });
            // First attempt - failure 1
            await expect(middleware(request, mockNext)).rejects.toThrow('Service down');
            // Second attempt - failure 2, opens circuit
            await expect(middleware(request, mockNext)).rejects.toThrow('Service down');
            expect(consoleSpy.error).toHaveBeenCalled();
            // Third attempt - circuit is open
            await expect(middleware(request, mockNext)).rejects.toThrow('Circuit breaker is open');
            expect(mockNext).toHaveBeenCalledTimes(2); // Next not called on open circuit
        });
        it('should reset circuit after timeout', async () => {
            const middleware = circuitBreakerMiddleware(1, 50); // 1 failure to open, 50ms reset
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const mockNext = vi.fn(async () => {
                throw new Error('Failure');
            });
            // Fail once, open circuit
            await expect(middleware(request, mockNext)).rejects.toThrow('Failure');
            // Circuit is open
            await expect(middleware(request, mockNext)).rejects.toThrow('Circuit breaker is open');
            // Wait for reset timeout
            await new Promise(r => setTimeout(r, 100));
            // Circuit should be reset now
            mockNext.mockImplementationOnce(async () => ({
                method: 'GET',
                status: 200,
                data: {},
                ok: true,
            }));
            const response = await middleware(request, mockNext);
            expect(response.status).toBe(200);
        });
    });
    describe('Middleware Composition', () => {
        it('should compose multiple middlewares in order', async () => {
            const callOrder = [];
            const middleware1 = async (req, next) => {
                callOrder.push('before-1');
                const result = await next(req);
                callOrder.push('after-1');
                return result;
            };
            const middleware2 = async (req, next) => {
                callOrder.push('before-2');
                const result = await next(req);
                callOrder.push('after-2');
                return result;
            };
            const composed = composeMiddleware([middleware1, middleware2]);
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const mockNext = vi.fn(async () => {
                callOrder.push('execute');
                return { method: 'GET', status: 200, data: {}, ok: true };
            });
            await composed(request, mockNext);
            expect(callOrder).toEqual(['before-1', 'before-2', 'execute', 'after-2', 'after-1']);
        });
    });
    describe('Middleware Presets', () => {
        it('should provide production middleware stack', async () => {
            const middleware = productionMiddlewareStack();
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const mockNext = vi.fn(async () => ({
                method: 'GET',
                status: 200,
                data: {},
                ok: true,
            }));
            const response = await middleware(request, mockNext);
            expect(response.status).toBe(200);
            expect(mockNext).toHaveBeenCalled();
            // Should have logged due to logging middleware being in the stack
            expect(consoleSpy.log).toHaveBeenCalled();
        });
        it('should provide development middleware stack', async () => {
            const middleware = developmentMiddlewareStack();
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const mockNext = vi.fn(async () => ({
                method: 'GET',
                status: 200,
                data: {},
                ok: true,
            }));
            const response = await middleware(request, mockNext);
            expect(response.status).toBe(200);
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('Error Handling in Middleware Chain', () => {
        it('should propagate errors through middleware stack', async () => {
            const middleware1 = async (req, next) => {
                try {
                    return await next(req);
                }
                catch (error) {
                    console.error('Caught in middleware1:', error);
                    throw error;
                }
            };
            const middleware2 = async (req, next) => {
                return next(req); // No error handling, error propagates
            };
            const composed = composeMiddleware([middleware1, middleware2]);
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const mockError = new Error('Request failed');
            const mockNext = vi.fn(async () => {
                throw mockError;
            });
            await expect(composed(request, mockNext)).rejects.toThrow('Request failed');
            expect(consoleSpy.error).toHaveBeenCalled();
        });
    });
    describe('Middleware Integration Patterns', () => {
        it('should allow middleware to modify responses', async () => {
            const responseModifyingMiddleware = async (req, next) => {
                const response = await next(req);
                return {
                    ...response,
                    data: { ...response.data, modified: true },
                };
            };
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const mockNext = vi.fn(async () => ({
                method: 'GET',
                status: 200,
                data: { original: 'data' },
                ok: true,
            }));
            const response = await responseModifyingMiddleware(request, mockNext);
            expect(response.data.original).toBe('data');
            expect(response.data.modified).toBe(true);
        });
        it('should allow early response returns (caching)', async () => {
            const cachingMiddleware = async (req, next) => {
                if (req.method === 'GET' && req.cachedResponse) {
                    return req.cachedResponse;
                }
                return next(req);
            };
            const request = { method: 'GET', baseUrl: 'https://api.test.com' };
            const cachedResponse = {
                method: 'GET',
                status: 200,
                data: { cached: true },
                ok: true,
            };
            request.cachedResponse = cachedResponse;
            const mockNext = vi.fn(async () => ({
                method: 'GET',
                status: 200,
                data: { fresh: true },
                ok: true,
            }));
            const response = await cachingMiddleware(request, mockNext);
            expect(response.data.cached).toBe(true);
            expect(mockNext).not.toHaveBeenCalled(); // Short-circuited
        });
    });
});
//# sourceMappingURL=middleware.test.js.map