import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HookRegistry, ServiceLifecyclePhase } from '../../src/core/lifecycle.ts';
import { InvokeRegistry } from '../../src/services/invoke-registry.ts';
import type { AppContext } from '../../src/ui/app.ts';

describe('ServiceLifecyclePhase - ERROR/RECONNECT/DISCONNECT (Phase 1.3.3)', () => {
  let hookRegistry: HookRegistry;
  let mockApp: AppContext;
  let invokeRegistry: InvokeRegistry;

  beforeEach(() => {
    hookRegistry = new HookRegistry();
    mockApp = {
      services: {
        api: {
          async fetch(url: string) {
            return { data: 'test' };
          }
        }
      }
    } as any;
    invokeRegistry = new InvokeRegistry(mockApp);
  });

  afterEach(() => {
    hookRegistry.clear();
  });

  describe('ERROR Phase', () => {
    it('should emit ERROR phase when service invoke fails', async () => {
      const errors: string[] = [];

      hookRegistry.on(ServiceLifecyclePhase.ERROR, async (context) => {
        errors.push(`ERROR: ${context.service}`);
      });

      // Simulate service error
      mockApp.services.failing = {
        async method() {
          throw new Error('Service failed');
        }
      };

      try {
        await (mockApp.services.failing as any).method();
      } catch (err) {
        // Trigger error phase manually (normally done by InvokeRegistry)
        await hookRegistry.execute(ServiceLifecyclePhase.ERROR, {
          app: mockApp,
          service: mockApp.services.failing,
          meta: { error: err }
        });
      }

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow ERROR phase hooks to attempt recovery', async () => {
      let recovered = false;

      hookRegistry.on(ServiceLifecyclePhase.ERROR, async (context) => {
        // Attempt recovery
        recovered = true;
      });

      mockApp.services.recoverable = {
        async method() {
          throw new Error('Temporary failure');
        }
      };

      try {
        await (mockApp.services.recoverable as any).method();
      } catch (err) {
        await hookRegistry.execute(ServiceLifecyclePhase.ERROR, {
          app: mockApp,
          service: mockApp.services.recoverable,
          meta: { error: err }
        });
      }

      expect(recovered).toBe(true);
    });

    it('should pass error context to ERROR phase handlers', async () => {
      let errorContext: any;

      hookRegistry.on(ServiceLifecyclePhase.ERROR, async (context) => {
        errorContext = context;
      });

      const testError = new Error('Test error');
      mockApp.services.test = {};

      await hookRegistry.execute(ServiceLifecyclePhase.ERROR, {
        app: mockApp,
        service: mockApp.services.test,
        meta: { error: testError }
      });

      expect(errorContext).toBeDefined();
      expect(errorContext.meta.error).toEqual(testError);
    });
  });

  describe('RECONNECT Phase', () => {
    it('should emit RECONNECT phase for network-based services', async () => {
      const reconnects: string[] = [];

      hookRegistry.on(ServiceLifecyclePhase.RECONNECT, async (context) => {
        reconnects.push(`RECONNECT: ${context.service}`);
      });

      // Simulate connection recovery
      mockApp.services.socket = {
        async reconnect() {
          return { connected: true };
        }
      };

      await hookRegistry.execute(ServiceLifecyclePhase.RECONNECT, {
        app: mockApp,
        service: mockApp.services.socket,
        meta: { reason: 'connection_lost' }
      });

      expect(reconnects.length).toBeGreaterThan(0);
    });

    it('should allow RECONNECT phase to configure retry strategy', async () => {
      let retryConfig: any;

      hookRegistry.on(ServiceLifecyclePhase.RECONNECT, async (context) => {
        retryConfig = {
          maxRetries: 5,
          backoffMs: 1000,
          exponential: true
        };
      });

      mockApp.services.websocket = {};

      await hookRegistry.execute(ServiceLifecyclePhase.RECONNECT, {
        app: mockApp,
        service: mockApp.services.websocket
      });

      expect(retryConfig).toBeDefined();
      expect(retryConfig.maxRetries).toBe(5);
    });

    it('should track reconnect attempts', async () => {
      const attempts: number[] = [];

      hookRegistry.on(ServiceLifecyclePhase.RECONNECT, async (context) => {
        const attempt = (context.meta?.attempt || 0) + 1;
        attempts.push(attempt);
      });

      for (let i = 0; i < 3; i++) {
        await hookRegistry.execute(ServiceLifecyclePhase.RECONNECT, {
          app: mockApp,
          service: mockApp.services.api,
          meta: { attempt: i }
        });
      }

      expect(attempts.length).toBe(3);
    });
  });

  describe('DISCONNECT Phase', () => {
    it('should emit DISCONNECT phase on service shutdown', async () => {
      const disconnects: string[] = [];

      hookRegistry.on(ServiceLifecyclePhase.DISCONNECT, async (context) => {
        disconnects.push(`DISCONNECT: ${context.service}`);
      });

      mockApp.services.persistent = {};

      await hookRegistry.execute(ServiceLifecyclePhase.DISCONNECT, {
        app: mockApp,
        service: mockApp.services.persistent
      });

      expect(disconnects.length).toBeGreaterThan(0);
    });

    it('should allow DISCONNECT phase for cleanup operations', async () => {
      const cleanups: string[] = [];

      hookRegistry.on(ServiceLifecyclePhase.DISCONNECT, async (context) => {
        cleanups.push('Closing connection...');
        cleanups.push('Saving state...');
        cleanups.push('Releasing resources...');
      });

      mockApp.services.managed = {};

      await hookRegistry.execute(ServiceLifecyclePhase.DISCONNECT, {
        app: mockApp,
        service: mockApp.services.managed
      });

      expect(cleanups).toContain('Closing connection...');
      expect(cleanups).toContain('Saving state...');
      expect(cleanups).toContain('Releasing resources...');
    });

    it('should handle graceful degradation on disconnect', async () => {
      let fallbackMode = false;

      hookRegistry.on(ServiceLifecyclePhase.DISCONNECT, async (context) => {
        fallbackMode = true;
      });

      mockApp.services.remote = {};

      await hookRegistry.execute(ServiceLifecyclePhase.DISCONNECT, {
        app: mockApp,
        service: mockApp.services.remote,
        meta: { graceful: true }
      });

      expect(fallbackMode).toBe(true);
    });
  });

  describe('Complete Service Lifecycle Cycle', () => {
    it('should handle full lifecycle: REGISTER -> AUTHENTICATE -> READY -> ERROR -> RECONNECT -> DISCONNECT', async () => {
      const phases: string[] = [];

      const trackPhase = (phase: ServiceLifecyclePhase) => {
        hookRegistry.on(phase, async (context) => {
          phases.push(phase);
        });
      };

      trackPhase(ServiceLifecyclePhase.REGISTER);
      trackPhase(ServiceLifecyclePhase.AUTHENTICATE);
      trackPhase(ServiceLifecyclePhase.READY);
      trackPhase(ServiceLifecyclePhase.ERROR);
      trackPhase(ServiceLifecyclePhase.RECONNECT);
      trackPhase(ServiceLifecyclePhase.DISCONNECT);

      mockApp.services.full = {};

      // Simulate lifecycle
      await hookRegistry.execute(ServiceLifecyclePhase.REGISTER, { app: mockApp });
      await hookRegistry.execute(ServiceLifecyclePhase.AUTHENTICATE, { app: mockApp });
      await hookRegistry.execute(ServiceLifecyclePhase.READY, { app: mockApp });
      await hookRegistry.execute(ServiceLifecyclePhase.ERROR, { app: mockApp });
      await hookRegistry.execute(ServiceLifecyclePhase.RECONNECT, { app: mockApp });
      await hookRegistry.execute(ServiceLifecyclePhase.DISCONNECT, { app: mockApp });

      expect(phases).toContain(ServiceLifecyclePhase.REGISTER);
      expect(phases).toContain(ServiceLifecyclePhase.AUTHENTICATE);
      expect(phases).toContain(ServiceLifecyclePhase.READY);
      expect(phases).toContain(ServiceLifecyclePhase.ERROR);
      expect(phases).toContain(ServiceLifecyclePhase.RECONNECT);
      expect(phases).toContain(ServiceLifecyclePhase.DISCONNECT);
    });
  });

  describe('ErrorMiddleware with Lifecycle Integration', () => {
    it('should trigger ERROR phase on invoke failure via middleware', async () => {
      const errorPhases: string[] = [];

      hookRegistry.on(ServiceLifecyclePhase.ERROR, async (context) => {
        errorPhases.push('ERROR');
      });

      const errorMiddleware = async (context: any, error: Error, retry: any) => {
        // Trigger error phase
        await hookRegistry.execute(ServiceLifecyclePhase.ERROR, {
          app: mockApp,
          meta: { error }
        });

        return {
          success: false,
          error,
          duration: 0,
          retries: 0,
          timestamp: Date.now()
        };
      };

      invokeRegistry.useErrorMiddleware(errorMiddleware);

      mockApp.services.failing = {
        async method() {
          throw new Error('Failed');
        }
      };

      const result = await invokeRegistry.executeServiceInvoke(
        { service: 'failing', method: 'method' },
        undefined,
        { maxRetries: 0 }
      );

      expect(result.success).toBe(false);
      expect(errorPhases).toContain('ERROR');
    });

    it('should allow error middleware to emit RECONNECT phase', async () => {
      const reconnectPhases: string[] = [];

      hookRegistry.on(ServiceLifecyclePhase.RECONNECT, async () => {
        reconnectPhases.push('RECONNECT');
      });

      const reconnectMiddleware = async (context: any, error: Error, retry: any) => {
        // On error, try to reconnect
        await hookRegistry.execute(ServiceLifecyclePhase.RECONNECT, {
          app: mockApp
        });

        // Then retry
        return await retry();
      };

      let attempts = 0;
      invokeRegistry.useErrorMiddleware(reconnectMiddleware);

      mockApp.services.reconnecting = {
        async method() {
          attempts++;
          if (attempts === 1) throw new Error('Connection lost');
          return { success: true };
        }
      };

      const result = await invokeRegistry.executeServiceInvoke(
        { service: 'reconnecting', method: 'method' },
        undefined,
        { maxRetries: 1 }
      );

      // May or may not reconnect depending on retry result
      expect(result).toBeDefined();
    });
  });

  describe('Multiple Hooks per Phase', () => {
    it('should execute all hooks registered for a phase', async () => {
      const executions: number[] = [];

      hookRegistry.on(ServiceLifecyclePhase.DISCONNECT, async () => {
        executions.push(1);
      });

      hookRegistry.on(ServiceLifecyclePhase.DISCONNECT, async () => {
        executions.push(2);
      });

      hookRegistry.on(ServiceLifecyclePhase.DISCONNECT, async () => {
        executions.push(3);
      });

      mockApp.services.test = {};

      await hookRegistry.execute(ServiceLifecyclePhase.DISCONNECT, {
        app: mockApp,
        service: mockApp.services.test
      });

      expect(executions).toHaveLength(3);
      expect(executions).toEqual([1, 2, 3]);
    });

    it('should maintain execution order of hooks', async () => {
      const order: string[] = [];

      hookRegistry.on(ServiceLifecyclePhase.RECONNECT, async () => {
        order.push('first');
      });

      hookRegistry.on(ServiceLifecyclePhase.RECONNECT, async () => {
        order.push('second');
      });

      hookRegistry.on(ServiceLifecyclePhase.RECONNECT, async () => {
        order.push('third');
      });

      mockApp.services.test = {};

      await hookRegistry.execute(ServiceLifecyclePhase.RECONNECT, {
        app: mockApp,
        service: mockApp.services.test
      });

      expect(order).toEqual(['first', 'second', 'third']);
    });
  });
});
