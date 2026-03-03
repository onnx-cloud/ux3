/**
 * Phase 1.2.2: InvokeRegistry Tests
 * 
 * Tests for the centralized service invocation registry
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InvokeRegistry, clearGlobalInvokeRegistry } from '../../src/services/invoke-registry.ts';
import type { AppContext } from '../../src/ui/app.ts';
import type { InvokeService, InvokeSrc } from '../../src/fsm/types.ts';

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
          return { data: 'test', ...input };
        },
        async call(method: string, params?: any) {
          return { method, params, success: true };
        },
      } as any,
      socket: {
        async fetch(input: any) {
          return { type: 'message', payload: input };
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

describe('InvokeRegistry (Phase 1.2.2)', () => {
  let registry: InvokeRegistry;
  let mockApp: AppContext;

  beforeEach(() => {
    mockApp = createMockAppContext();
    registry = new InvokeRegistry(mockApp);
    clearGlobalInvokeRegistry();
  });

  afterEach(() => {
    clearGlobalInvokeRegistry();
  });

  // ============================================================================
  // Service Invoke Tests
  // ============================================================================

  it('should execute service invokes successfully', async () => {
    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch',
      input: { url: '/users' }
    };

    const result = await registry.executeServiceInvoke(invoke);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.retries).toBe(0);
  });

  it('should handle service invoke errors gracefully', async () => {
    const invoke: InvokeService = {
      service: 'nonexistent',
      method: 'fetch'
    };

    const result = await registry.executeServiceInvoke(invoke);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Service not registered');
  });

  it('should support retry on service invoke failure', async () => {
    let attempts = 0;
    mockApp.services.flaky = {
      async fetch() {
        attempts++;
        if (attempts < 2) throw new Error('Temporary failure');
        return { data: 'success after retry' };
      }
    } as any;

    const invoke: InvokeService = {
      service: 'flaky',
      method: 'fetch',
      maxRetries: 2
    };

    const result = await registry.executeServiceInvoke(invoke);

    expect(result.success).toBe(true);
    expect(result.retries).toBe(1);
    expect(attempts).toBe(2);
  });

  it('should respect maxRetries limit', async () => {
    let attempts = 0;
    mockApp.services.failing = {
      async fetch() {
        attempts++;
        throw new Error('Always fails');
      }
    } as any;

    const invoke: InvokeService = {
      service: 'failing',
      method: 'fetch',
      maxRetries: 2
    };

    const result = await registry.executeServiceInvoke(invoke);

    expect(result.success).toBe(false);
    expect(result.retries).toBe(2);
    expect(attempts).toBe(3); // initial + 2 retries
  });

  it('should support custom retry delays', async () => {
    let attempts = 0;
    const timestamps: number[] = [];

    mockApp.services.delayed = {
      async fetch() {
        timestamps.push(Date.now());
        attempts++;
        if (attempts < 2) throw new Error('Fail once');
        return { success: true };
      }
    } as any;

    const invoke: InvokeService = {
      service: 'delayed',
      method: 'fetch',
      maxRetries: 1,
      retryDelay: 50
    };

    const result = await registry.executeServiceInvoke(invoke);

    expect(result.success).toBe(true);
    expect(timestamps.length).toBe(2);
    const delay = timestamps[1]! - timestamps[0]!;
    expect(delay).toBeGreaterThanOrEqual(40); // ~50ms with tolerance
  });

  it('should pass input to service method', async () => {
    const mockInput = { url: '/api/users', id: 123 };
    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch',
      input: mockInput
    };

    const result = await registry.executeServiceInvoke(invoke);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject(mockInput);
  });

  it('should use fetch method by default', async () => {
    const invoke: InvokeService = {
      service: 'api',
      // no method specified
      input: { test: true }
    };

    const result = await registry.executeServiceInvoke(invoke);

    expect(result.success).toBe(true);
  });

  // ============================================================================
  // Source (Src) Invoke Tests
  // ============================================================================

  it('should execute src invokes with functions', async () => {
    const myFunc = async (input: any) => ({ result: 'success', input });

    const invoke: InvokeSrc = {
      src: myFunc,
      input: { test: true }
    };

    const result = await registry.executeSrcInvoke(invoke);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ result: 'success' });
  });

  it('should execute src invokes with string function names', async () => {
    (globalThis as any).myGlobalFunc = async (input: any) => ({ 
      name: 'myGlobalFunc', 
      input 
    });

    const invoke: InvokeSrc = {
      src: 'myGlobalFunc',
      input: { data: 'test' }
    };

    const result = await registry.executeSrcInvoke(invoke);

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('myGlobalFunc');
  });

  it('should handle src invoke errors', async () => {
    const faulty = async () => {
      throw new Error('Src function failed');
    };

    const invoke: InvokeSrc = {
      src: faulty
    };

    const result = await registry.executeSrcInvoke(invoke);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Src function failed');
  });

  it('should support retry for src invokes', async () => {
    let attempts = 0;
    const retryFunc = async () => {
      attempts++;
      if (attempts < 2) throw new Error('Temporary');
      return { attempts };
    };

    const invoke: InvokeSrc = {
      src: retryFunc,
      maxRetries: 2
    };

    const result = await registry.executeSrcInvoke(invoke);

    expect(result.success).toBe(true);
    expect(result.retries).toBe(1);
  });

  // ============================================================================
  // Unified Execute Tests
  // ============================================================================

  it('should execute unified invoke with service', async () => {
    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch',
      input: { test: 1 }
    };

    const result = await registry.executeInvoke(invoke);

    expect(result.success).toBe(true);
  });

  it('should execute unified invoke with src', async () => {
    const myFunc = async () => ({ done: true });
    const invoke: InvokeSrc = { src: myFunc };

    const result = await registry.executeInvoke(invoke);

    expect(result.success).toBe(true);
  });

  it('should reject invalid invoke config', async () => {
    const invoke: any = { invalid: true };

    const result = await registry.executeInvoke(invoke);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Invalid invoke config');
  });

  // ============================================================================
  // Listener/Monitoring Tests
  // ============================================================================

  it('should notify listeners of invoke start', async () => {
    const events: string[] = [];
    registry.onInvoke((invoke) => {
      if (invoke.status === 'start') events.push('start');
    });

    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch'
    };

    await registry.executeServiceInvoke(invoke);

    expect(events).toContain('start');
  });

  it('should notify listeners of invoke success', async () => {
    const events: string[] = [];
    registry.onInvoke((invoke) => {
      events.push(invoke.status);
    });

    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch'
    };

    await registry.executeServiceInvoke(invoke);

    expect(events).toContain('success');
  });

  it('should notify listeners of invoke error', async () => {
    const events: string[] = [];
    registry.onInvoke((invoke) => {
      events.push(invoke.status);
    });

    const invoke: InvokeService = {
      service: 'nonexistent',
      method: 'fetch'
    };

    await registry.executeServiceInvoke(invoke);

    expect(events).toContain('error');
  });

  it('should notify listeners of retry', async () => {
    const events: string[] = [];
    registry.onInvoke((invoke) => {
      events.push(invoke.status);
    });

    let attempts = 0;
    mockApp.services.retrying = {
      async fetch() {
        if (++attempts < 2) throw new Error('Fail');
        return { ok: true };
      }
    } as any;

    const invoke: InvokeService = {
      service: 'retrying',
      method: 'fetch',
      maxRetries: 1
    };

    await registry.executeServiceInvoke(invoke);

    expect(events).toContain('retry');
    expect(events).toContain('success');
  });

  it('should support multiple listeners', async () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const listener3 = vi.fn();

    registry.onInvoke(listener1);
    registry.onInvoke(listener2);
    registry.onInvoke(listener3);

    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch'
    };

    await registry.executeServiceInvoke(invoke);

    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
    expect(listener3).toHaveBeenCalled();
  });

  it('should allow removing listeners', async () => {
    const listener = vi.fn();
    registry.onInvoke(listener);
    registry.offInvoke(listener);

    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch'
    };

    await registry.executeServiceInvoke(invoke);

    expect(listener).not.toHaveBeenCalled();
  });

  // ============================================================================
  // Statistics Tests
  // ============================================================================

  it('should track invoke statistics', async () => {
    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch'
    };

    await registry.executeServiceInvoke(invoke);

    const stats = registry.getStats('api', 'fetch');
    expect(stats).toBeDefined();
    expect(stats?.count).toBe(1);
    expect(stats?.avgTime).toBeGreaterThanOrEqual(0);
  });

  it('should accumulate statistics across multiple invokes', async () => {
    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch'
    };

    await registry.executeServiceInvoke(invoke);
    await registry.executeServiceInvoke(invoke);
    await registry.executeServiceInvoke(invoke);

    const stats = registry.getStats('api', 'fetch');
    expect(stats?.count).toBe(3);
  });

  it('should calculate average time in statistics', async () => {
    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch'
    };

    await registry.executeServiceInvoke(invoke);
    await registry.executeServiceInvoke(invoke);

    const stats = registry.getStats('api', 'fetch');
    expect(stats?.avgTime).toBe(stats?.totalTime! / stats?.count!);
  });

  it('should clear all statistics', async () => {
    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch'
    };

    await registry.executeServiceInvoke(invoke);
    let stats = registry.getStats('api', 'fetch');
    expect(stats?.count).toBe(1);

    registry.clear();
    stats = registry.getStats('api', 'fetch');
    expect(stats).toBeUndefined();
  });

  it('should clear specific service statistics', async () => {
    const invoke1: InvokeService = {
      service: 'api',
      method: 'fetch'
    };

    const invoke2: InvokeService = {
      service: 'api',
      method: 'call'
    };

    await registry.executeServiceInvoke(invoke1);
    await registry.executeServiceInvoke(invoke2);

    registry.clearStats('api', 'fetch');

    const stats1 = registry.getStats('api', 'fetch');
    const stats2 = registry.getStats('api', 'call');

    expect(stats1).toBeUndefined();
    expect(stats2).toBeDefined();
  });

  // ============================================================================
  // Context Passing Tests
  // ============================================================================

  it('should pass context to service methods', async () => {
    const capturedContexts: any[] = [];
    mockApp.services.contextApi = {
      async fetch(input: any, context?: any) {
        capturedContexts.push(context);
        return { input, context };
      }
    } as any;

    const ctx = { userId: 123, sessionId: 'xyz' };
    const invoke: InvokeService = {
      service: 'contextApi',
      method: 'fetch'
    };

    await registry.executeServiceInvoke(invoke, ctx);

    expect(capturedContexts[0]).toEqual(ctx);
  });

  it('should pass context to src functions', async () => {
    const capturedContexts: any[] = [];
    const myFunc = async (input: any, context?: any) => {
      capturedContexts.push(context);
      return { context };
    };

    const ctx = { userId: 456 };
    const invoke: InvokeSrc = { src: myFunc };

    await registry.executeSrcInvoke(invoke, ctx);

    expect(capturedContexts[0]).toEqual(ctx);
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  it('should handle undefined service gracefully', async () => {
    const invoke: InvokeService = {
      service: 'undefined-service',
      method: 'fetch'
    };

    const result = await registry.executeServiceInvoke(invoke);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle undefined src gracefully', async () => {
    const invoke: InvokeSrc = {
      src: 'nonexistent-func'
    };

    const result = await registry.executeSrcInvoke(invoke);

    expect(result.success).toBe(false);
  });

  it('should handle listener exceptions gracefully', async () => {
    const goodListener = vi.fn();
    const badListener = () => {
      throw new Error('Listener error');
    };

    registry.onInvoke(goodListener);
    registry.onInvoke(badListener);

    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch'
    };

    // Should not throw despite bad listener
    await expect(registry.executeServiceInvoke(invoke)).resolves.toBeDefined();

    // Good listener should still be called
    expect(goodListener).toHaveBeenCalled();
  });

  it('should handle empty input', async () => {
    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch'
      // no input
    };

    const result = await registry.executeServiceInvoke(invoke);

    expect(result.success).toBe(true);
  });

  it('should handle zero retry delay', async () => {
    let attempts = 0;
    mockApp.services.immediate = {
      async fetch() {
        if (++attempts < 2) throw new Error('Fail');
        return { ok: true };
      }
    } as any;

    const invoke: InvokeService = {
      service: 'immediate',
      method: 'fetch',
      maxRetries: 1,
      retryDelay: 0
    };

    const result = await registry.executeServiceInvoke(invoke);

    expect(result.success).toBe(true);
  });

  it('should record timing information', async () => {
    const invoke: InvokeService = {
      service: 'api',
      method: 'fetch'
    };

    const start = Date.now();
    const result = await registry.executeServiceInvoke(invoke);
    const elapsed = Date.now() - start;

    expect(result.duration).toBeLessThanOrEqual(elapsed + 10); // ~10ms tolerance
    expect(result.timestamp).toBeCloseTo(start, -2);
  });
});
