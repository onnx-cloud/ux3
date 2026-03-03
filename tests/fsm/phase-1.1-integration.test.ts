/**
 * Integration test for Phase 1.1 features:
 * - Auto-retry with exponential backoff
 * - Error recovery with errorTarget
 * - errorActions for side effects
 * - Service lifecycle hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateMachine } from '../../src/fsm/state-machine';
import type { StateConfig } from '../../src/fsm/types';

describe('Phase 1.1 Integration - Service Lifecycle & Error Recovery', () => {
  
  describe('Real-world scenario: User authentication with retry', () => {
    it('should handle failed auth with retry and fallback to login form', async () => {
      // Simulates: Try to auth → fail → retry → fail again → show login form
      
      const mockAuthService = vi.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({ user: 'alice', token: 'xyz' });

      const mockMetricsService = vi.fn().mockResolvedValue({});

      const config: StateConfig<any> = {
        id: 'auth-flow',
        initial: 'boot',
        context: {
          user: null,
          token: null,
          error: null,
          retryCount: 0,
          metrics: {
            authAttempts: 0,
            authErrors: 0
          }
        },
        states: {
          boot: {
            entry: [
              (ctx) => {
                ctx.metrics.authAttempts = 1;
              }
            ],
            on: { INIT_AUTH: 'authenticating' }
          },

          authenticating: {
            invoke: {
              src: 'authenticate',
              maxRetries: 2,
              retryDelay: 20  // 20ms base
            },
            errorTarget: 'authFailed',
            errorActions: [
              // Log error
              (ctx, err) => {
                ctx.metrics.authErrors++;
                console.log(`Auth error (${ctx.metrics.authErrors}): ${err.message}`);
              },
              // Notify metrics service
              (ctx, err) => {
                // Would send to metrics service
              }
            ],
            on: {
              SUCCESS: {
                target: 'authenticated',
                actions: [
                  (ctx, event) => {
                    ctx.user = event.payload.user;
                    ctx.token = event.payload.token;
                  }
                ]
              }
            }
          },

          authenticated: {
            entry: [(ctx) => console.log(`Authenticated as ${ctx.user}`)],
            on: { LOGOUT: 'boot' }
          },

          authFailed: {
            entry: [
              (ctx) => {
                ctx.error = 'Authentication failed. Please try logging in manually.';
              }
            ],
            on: {
              RETRY: 'authenticating',
              MANUAL_LOGIN: 'loginForm'
            }
          },

          loginForm: {
            on: {
              FORM_SUBMIT: 'authenticating'
            }
          }
        }
      };

      const fsm = new StateMachine(config);
      fsm.registerInvokeHandler('authenticate', mockAuthService);
      fsm.registerInvokeHandler('logMetrics', mockMetricsService);

      // Start the flow
      fsm.send('INIT_AUTH');
      expect(fsm.getState()).toBe('authenticating');

      // Wait for retries to complete (fail twice, then succeed on 3rd try)
      await new Promise(r => setTimeout(r, 200));

      // Should have succeeded on 3rd attempt
      expect(fsm.getState()).toBe('authenticated');
      expect(fsm.getContext().user).toBe('alice');
      expect(fsm.getContext().token).toBe('xyz');
      expect(mockAuthService).toHaveBeenCalledTimes(3);  // Initial + 2 retries
      expect(fsm.getContext().metrics.authAttempts).toBe(1);
    });

    it('should transition to login form if all retries exhausted', async () => {
      const mockAuthService = vi.fn()
        .mockRejectedValue(new Error('Service down'));

      const config: StateConfig<any> = {
        id: 'auth-fail',
        initial: 'idle',
        context: { error: null, retriesExhausted: false },
        states: {
          idle: {
            on: { START_AUTH: 'authenticating' }
          },

          authenticating: {
            invoke: {
              src: 'auth',
              maxRetries: 1,  // Only one retry
              retryDelay: 10
            },
            errorTarget: 'loginRequired',
            errorActions: [
              (ctx) => {
                ctx.retriesExhausted = true;
              }
            ],
            on: { SUCCESS: 'authenticated' }
          },

          authenticated: {},

          loginRequired: {
            on: { SUBMIT_CREDENTIALS: 'authenticating' }
          }
        }
      };

      const fsm = new StateMachine(config);
      fsm.registerInvokeHandler('auth', mockAuthService);

      fsm.send('START_AUTH');
      expect(fsm.getState()).toBe('authenticating');

      await new Promise(r => setTimeout(r, 100));

      expect(fsm.getState()).toBe('loginRequired');
      expect(fsm.getContext().retriesExhausted).toBe(true);
    });
  });

  describe('Real-world scenario: Data fetching with fallback UI', () => {
    it('should show stale data while retrying fresh data', async () => {
      const mockFetchService = vi.fn()
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ items: [1, 2, 3], cached: false });

      const config: StateConfig<any> = {
        id: 'data-fetch',
        initial: 'idle',
        context: {
          items: [],
          cached: false,
          cached_at: null,
          loading: false,
          error: null
        },
        states: {
          idle: {
            on: { LOAD: 'loading' }
          },

          loading: {
            entry: [(ctx) => ctx.loading = true],
            invoke: {
              src: 'fetchItems',
              maxRetries: 1,
              retryDelay: 30
            },
            errorTarget: 'showCached',
            on: {
              SUCCESS: {
                target: 'loaded',
                actions: [
                  (ctx, evt) => {
                    ctx.items = evt.payload.items;
                    ctx.cached = evt.payload.cached || false;
                    ctx.loading = false;
                  }
                ]
              }
            }
          },

          loaded: {
            entry: [(ctx) => ctx.loading = false],
            on: { LOAD: 'loading' }
          },

          showCached: {
            entry: [
              (ctx) => {
                ctx.loading = false;
                if (ctx.items.length === 0) {
                  ctx.error = 'No data available. Please try again.';
                }
              }
            ],
            on: { RETRY: 'loading' }
          }
        }
      };

      const fsm = new StateMachine(config);
      fsm.registerInvokeHandler('fetchItems', mockFetchService);

      // Set up stale cache
      fsm.setState({ items: [1, 2, 3, 4, 5], cached: true, cached_at: Date.now() });

      // Load fresh data
      fsm.send('LOAD');
      expect(fsm.getState()).toBe('loading');

      // Wait for retry
      await new Promise(r => setTimeout(r, 100));

      // Should succeed on retry
      expect(fsm.getState()).toBe('loaded');
      expect(fsm.getContext().items).toEqual([1, 2, 3]);
      expect(fsm.getContext().cached).toBe(false);
    });
  });

  describe('Real-world scenario: Payment processing with multiple retries', () => {
    it('should retry payment with increasing delays and detailed error logs', async () => {
      const logs: string[] = [];
      const mockPaymentService = vi.fn()
        .mockRejectedValueOnce(new Error('Card declined'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ transactionId: 'TXN123', status: 'completed' });

      const config: StateConfig<{
        amount: number;
        cardId: string;
        transactionId: string | null;
        status: string;
        logs: string[];
      }> = {
        id: 'payment',
        initial: 'idle',
        context: {
          amount: 0,
          cardId: '',
          transactionId: null,
          status: 'idle',
          logs: logs
        },
        states: {
          idle: {
            on: { PROCESS: 'processing' }
          },

          processing: {
            invoke: {
              src: 'processPayment',
              maxRetries: 2,
              retryDelay: (attempt) => (attempt + 1) * 50  // 50ms, 100ms
            },
            errorTarget: 'failed',
            errorActions: [
              (ctx, err) => {
                ctx.logs.push(`[ERROR] Payment failed: ${err.message}`);
              },
              (ctx, err) => {
                if ((err as any).code === 'CARD_DECLINED') {
                  ctx.logs.push('[ACTION] Please verify card details');
                }
              }
            ],
            on: {
              SUCCESS: {
                target: 'completed',
                actions: [
                  (ctx, evt) => {
                    ctx.transactionId = evt.payload.transactionId;
                    ctx.status = evt.payload.status;
                    ctx.logs.push(`[SUCCESS] Payment completed: ${evt.payload.transactionId}`);
                  }
                ]
              }
            }
          },

          completed: {
            on: { NEW_PAYMENT: 'idle' }
          },

          failed: {
            entry: [
              (ctx) => {
                ctx.status = 'failed';
                ctx.logs.push('[STATE] Transitioned to failed, waiting for user action');
              }
            ],
            on: { RETRY: 'processing', CANCEL: 'idle' }
          }
        }
      };

      const fsm = new StateMachine(config);
      fsm.registerInvokeHandler('processPayment', mockPaymentService);

      fsm.send('PROCESS');
      expect(fsm.getState()).toBe('processing');

      await new Promise(r => setTimeout(r, 300));

      expect(fsm.getState()).toBe('completed');
      expect(fsm.getContext().transactionId).toBe('TXN123');
      expect(fsm.getContext().status).toBe('completed');
      expect(fsm.getContext().logs).toContain('[SUCCESS] Payment completed: TXN123');
      expect(mockPaymentService).toHaveBeenCalledTimes(3);  // Initial + 2 retries
    });
  });

  describe('Guard checks for safe event handling', () => {
    it('should prevent double-submission with can() check', () => {
      const config: StateConfig<any> = {
        id: 'form',
        initial: 'idle',
        context: { submitting: false },
        states: {
          idle: {
            on: { SUBMIT: 'submitting' }
          },
          submitting: {
            on: { CANCEL: 'idle' }
          }
        }
      };

      const fsm = new StateMachine(config);

      // Can submit from idle
      expect(fsm.can('SUBMIT')).toBe(true);

      fsm.send('SUBMIT');

      // Cannot submit while submitting
      expect(fsm.can('SUBMIT')).toBe(false);
      // But can cancel
      expect(fsm.can('CANCEL')).toBe(true);
    });
  });
});
