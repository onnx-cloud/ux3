/**
 * IAM Integration Tests
 * End-to-end tests for complete IAM flows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateMachine } from '../../src/fsm';
import { config } from '../../examples/iam/generated/config';

// Mock service responses
const mockAuthService = {
  login: vi.fn(async (email: string, password: string) => {
    if (email && password) {
      return { token: 'jwt-token-123', userId: 'user-1', email };
    }
    throw new Error('Invalid credentials');
  }),
  logout: vi.fn(async () => ({ success: true })),
};

const mockAccountService = {
  fetch: vi.fn(async () => ({
    id: 'user-1',
    email: 'user@example.com',
    name: 'John Doe',
    phone: '+1-234-567-8900',
  })),
  update: vi.fn(async (data: any) => ({ ...data, updated: true })),
};

const mockChatService = {
  connect: vi.fn(async () => ({ connected: true, sessionId: 'chat-123' })),
  send: vi.fn(async (message: string) => ({ id: 'msg-1', text: message })),
  disconnect: vi.fn(async () => ({ disconnected: true })),
};

const mockMarketService = {
  fetchData: vi.fn(async () => ({
    assets: [
      { symbol: 'AAPL', price: 150 },
      { symbol: 'GOOGL', price: 2800 },
    ],
  })),
};

describe('IAM Integration Tests', () => {
  let authFSM: StateMachine<any>;
  let accountFSM: StateMachine<any>;
  let chatFSM: StateMachine<any>;
  let dashboardFSM: StateMachine<any>;
  let marketFSM: StateMachine<any>;

  beforeEach(() => {
    authFSM = new StateMachine(config.machines.auth);
    accountFSM = new StateMachine(config.machines.account);
    chatFSM = new StateMachine(config.machines.chat);
    dashboardFSM = new StateMachine(config.machines.dashboard);
    marketFSM = new StateMachine(config.machines.market);

    vi.clearAllMocks();
  });

  describe('Complete Login Flow', () => {
    it('should complete login: idle → submitting → success', async () => {
      const states: string[] = [];

      auth.subscribe((state) => {
        states.push(state);
      });

      expect(auth.getState()).toBe('idle');

      // Simulate user input
      auth.send('LOGIN', { email: 'user@example.com', password: 'secret' });
      expect(auth.getState()).toBe('submitting');

      // Simulate service response
      auth.send('SUCCESS', { token: 'jwt-token' });
      expect(auth.getState()).toBe('success');

      expect(states).toContain('idle');
      expect(states).toContain('submitting');
      expect(states).toContain('success');
    });

    it('should handle login error: idle → submitting → error → idle', async () => {
      const states: string[] = [];

      auth.subscribe((state) => {
        states.push(state);
      });

      auth.send('LOGIN');
      expect(auth.getState()).toBe('submitting');

      auth.send('FAILURE', { error: 'Invalid credentials' });
      expect(auth.getState()).toBe('error');

      auth.send('RETRY');
      expect(auth.getState()).toBe('idle');

      expect(states).toContain('submitting');
      expect(states).toContain('error');
      expect(states).toContain('idle');
    });

    it('should persist login token in context', () => {
      auth.send('LOGIN', { email: 'user@example.com' });
      auth.send('SUCCESS', { token: 'jwt-token-123', userId: 'user-1' });

      const context = auth.getContext();
      expect(context.token).toBeDefined();
      expect(context.userId).toBeDefined();
    });

    it('should allow retry after failed login', (done) => {
      let attemptCount = 0;

      auth.subscribe((state) => {
        if (state === 'submitting') {
          attemptCount++;
          if (attemptCount === 1) {
            auth.send('FAILURE');
          } else if (attemptCount === 2) {
            auth.send('SUCCESS');
            expect(auth.getState()).toBe('success');
            done();
          }
        }
      });

      auth.send('LOGIN');
      auth.send('RETRY');
    });
  });

  describe('Account Management Flow', () => {
    it('should view account: loading → viewing', (done) => {
      const states: string[] = [];

      account.subscribe((state) => {
        states.push(state);
        if (state === 'viewing') {
          expect(states).toContain('loading');
          expect(states).toContain('viewing');
          done();
        }
      });

      account.send('SUCCESS');
    });

    it('should edit account: viewing → editing', (done) => {
      account.send('SUCCESS'); // viewing state

      let transitions = 0;
      account.subscribe((state) => {
        transitions++;
        if (transitions === 2) {
          account.send('EDIT');
        }
        if (state === 'editing') {
          expect(state).toBe('editing');
          done();
        }
      });
    });

    it('should save account changes: editing → saving → viewing', (done) => {
      account.send('SUCCESS'); // viewing state

      const newData = {
        email: 'newemail@example.com',
        name: 'Jane Doe',
        phone: '+1-555-123-4567',
      };

      let transitions = 0;
      account.subscribe((state) => {
        transitions++;
        if (transitions === 2) {
          account.send('EDIT');
        } else if (transitions === 3 && state === 'editing') {
          account.send('SAVE', newData);
        } else if (transitions === 4 && state === 'saving') {
          account.send('SUCCESS');
        } else if (transitions === 5 && state === 'viewing') {
          const context = account.getContext();
          expect(context.email).toBeDefined();
          done();
        }
      });
    });

    it('should cancel edits: editing → viewing (preserving original)', (done) => {
      account.send('SUCCESS'); // viewing state
      const originalContext = { email: 'original@example.com' };

      let transitions = 0;
      account.subscribe((state) => {
        transitions++;
        if (transitions === 2) {
          account.send('EDIT');
        } else if (transitions === 3 && state === 'editing') {
          account.send('CANCEL');
        } else if (transitions === 4 && state === 'viewing') {
          expect(state).toBe('viewing');
          done();
        }
      });
    });

    it('should handle save error: editing → saving → error → editing', (done) => {
      account.send('SUCCESS'); // viewing state

      let transitions = 0;
      account.subscribe((state) => {
        transitions++;
        if (transitions === 2) {
          account.send('EDIT');
        } else if (transitions === 3 && state === 'editing') {
          account.send('SAVE');
        } else if (transitions === 4 && state === 'saving') {
          account.send('FAILURE', { error: 'Network error' });
        } else if (transitions === 5 && state === 'error') {
          expect(state).toBe('error');
          done();
        }
      });
    });
  });

  describe('Chat Connection Flow', () => {
    it('should connect to chat: idle → loading → connected', (done) => {
      const states: string[] = [];

      chat.subscribe((state) => {
        states.push(state);
        if (state === 'connected') {
          expect(states).toContain('idle');
          expect(states).toContain('loading');
          expect(states).toContain('connected');
          done();
        }
      });

      chat.send('CONNECT', { channel: 'general' });
      chat.send('SUCCESS');
    });

    it('should send messages while connected', (done) => {
      let readyToSend = false;

      chat.subscribe((state) => {
        if (state === 'connected' && !readyToSend) {
          readyToSend = true;
          chat.send('SEND_MESSAGE', { text: 'Hello!' });
        }
        if (readyToSend) {
          expect(chat.getState()).toBe('connected');
          done();
        }
      });

      chat.send('CONNECT');
      chat.send('SUCCESS');
    });

    it('should disconnect: connected → idle', (done) => {
      let connected = false;

      chat.subscribe((state) => {
        if (state === 'connected' && !connected) {
          connected = true;
          chat.send('DISCONNECT');
        }
        if (connected && state === 'idle') {
          expect(state).toBe('idle');
          done();
        }
      });

      chat.send('CONNECT');
      chat.send('SUCCESS');
    });

    it('should handle connection error: loading → error → idle', (done) => {
      let attempts = 0;

      chat.subscribe((state) => {
        if (state === 'loading' && attempts === 0) {
          attempts++;
          chat.send('FAILURE', { error: 'Connection failed' });
        }
        if (state === 'error') {
          chat.send('RETRY');
        }
        if (state === 'idle' && attempts > 0) {
          expect(state).toBe('idle');
          done();
        }
      });

      chat.send('CONNECT');
    });

    it('should persist session context while connected', (done) => {
      chat.subscribe((state) => {
        if (state === 'connected') {
          const context = chat.getContext();
          expect(context).toBeDefined();
          done();
        }
      });

      chat.send('CONNECT', { channel: 'general', userId: 'user-1' });
      chat.send('SUCCESS', { sessionId: 'session-123' });
    });
  });

  describe('Dashboard Load Flow', () => {
    it('should load dashboard: idle → loading → loaded', (done) => {
      const states: string[] = [];

      dashboard.subscribe((state) => {
        states.push(state);
        if (state === 'loaded') {
          expect(states).toContain('idle');
          expect(states).toContain('loading');
          expect(states).toContain('loaded');
          done();
        }
      });

      dashboard.send('LOAD');
      dashboard.send('SUCCESS');
    });

    it('should handle load error: loading → error → idle', (done) => {
      dashboard.subscribe((state) => {
        if (state === 'loading') {
          dashboard.send('FAILURE');
        }
        if (state === 'error') {
          dashboard.send('RELOAD');
          expect(dashboard.getState()).toBe('idle');
          done();
        }
      });

      dashboard.send('LOAD');
    });

    it('should reload dashboard data', (done) => {
      dashboard.subscribe((state) => {
        if (state === 'loaded') {
          dashboard.send('RELOAD');
          expect(dashboard.getState()).toBe('loading');
          done();
        }
      });

      dashboard.send('LOAD');
      dashboard.send('SUCCESS');
    });
  });

  describe('Market Data Flow', () => {
    it('should view market data: idle → loading → loaded', (done) => {
      const states: string[] = [];

      market.subscribe((state) => {
        states.push(state);
        if (state === 'loaded') {
          expect(states).toContain('idle');
          expect(states).toContain('loading');
          expect(states).toContain('loaded');
          done();
        }
      });

      market.send('VIEW');
      market.send('SUCCESS');
    });

    it('should filter market data without reload', (done) => {
      market.subscribe((state) => {
        if (state === 'loaded') {
          const stateBefore = market.getState();
          market.send('FILTER', { symbol: 'AAPL' });
          const stateAfter = market.getState();
          expect(stateBefore).toBe(stateAfter);
          done();
        }
      });

      market.send('VIEW');
      market.send('SUCCESS');
    });

    it('should reload market data: loaded → loading → loaded', (done) => {
      let reloaded = false;

      market.subscribe((state) => {
        if (state === 'loaded' && !reloaded) {
          reloaded = true;
          market.send('RELOAD');
          expect(market.getState()).toBe('loading');
        }
        if (reloaded && state === 'loaded') {
          done();
        }
      });

      market.send('VIEW');
      market.send('SUCCESS');
    });
  });

  describe('Multi-FSM Interaction', () => {
    it('should handle simultaneous auth and dashboard loading', (done) => {
      const states = {
        auth: [] as string[],
        dashboard: [] as string[],
      };

      auth.subscribe((state) => {
        states.auth.push(state);
      });

      dashboard.subscribe((state) => {
        states.dashboard.push(state);
      });

      auth.send('LOGIN');
      dashboard.send('LOAD');

      expect(auth.getState()).toBe('submitting');
      expect(dashboard.getState()).toBe('loading');

      auth.send('SUCCESS');
      dashboard.send('SUCCESS');

      expect(auth.getState()).toBe('success');
      expect(dashboard.getState()).toBe('loaded');

      done();
    });

    it('should allow chat connection after login success', (done) => {
      auth.subscribe((state) => {
        if (state === 'success') {
          chat.send('CONNECT', { userId: auth.getContext().userId });
        }
      });

      chat.subscribe((state) => {
        if (state === 'connected') {
          expect(auth.getState()).toBe('success');
          expect(chat.getState()).toBe('connected');
          done();
        }
      });

      auth.send('LOGIN');
      auth.send('SUCCESS');
      chat.send('SUCCESS');
    });

    it('should maintain market data while chatting', (done) => {
      market.subscribe((state) => {
        if (state === 'loaded') {
          chat.send('CONNECT');
          chat.send('SUCCESS');
        }
      });

      chat.subscribe((state) => {
        if (state === 'connected') {
          expect(market.getState()).toBe('loaded');
          chat.send('SEND_MESSAGE');
          expect(chat.getState()).toBe('connected');
          expect(market.getState()).toBe('loaded');
          done();
        }
      });

      market.send('VIEW');
      market.send('SUCCESS');
    });
  });

  describe('Error Recovery Flows', () => {
    it('should recover from auth failure and retry', (done) => {
      let attempts = 0;

      auth.subscribe((state) => {
        if (state === 'error') {
          attempts++;
          auth.send('RETRY');
        }
        if (state === 'submitting' && attempts >= 1) {
          auth.send('SUCCESS');
        }
        if (state === 'success') {
          expect(attempts).toBeGreaterThanOrEqual(1);
          done();
        }
      });

      auth.send('LOGIN');
      auth.send('FAILURE');
    });

    it('should recover from network timeout', (done) => {
      dashboard.subscribe((state) => {
        if (state === 'loading') {
          dashboard.send('FAILURE', { error: 'Timeout' });
        }
        if (state === 'error') {
          dashboard.send('RELOAD');
        }
        if (state === 'loading' && dashboard.getState() !== 'loading') {
          // Second load attempt
          dashboard.send('SUCCESS');
        }
        if (state === 'loaded') {
          done();
        }
      });

      dashboard.send('LOAD');
    });
  });
});
