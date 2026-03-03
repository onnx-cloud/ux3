/**
 * IAM Integration Tests
 * End-to-end tests for complete IAM flows
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateMachine } from '@ux3/fsm';
import { config } from '../../examples/iam/generated/config';
// Mock service responses
const mockAuthService = {
    login: vi.fn(async (email, password) => {
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
    update: vi.fn(async (data) => ({ ...data, updated: true })),
};
const mockChatService = {
    connect: vi.fn(async () => ({ connected: true, sessionId: 'chat-123' })),
    send: vi.fn(async (message) => ({ id: 'msg-1', text: message })),
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
    let authFSM;
    let accountFSM;
    let chatFSM;
    let dashboardFSM;
    let marketFSM;
    beforeEach(() => {
        authFSM = new StateMachine(config.machines.authFSM);
        accountFSM = new StateMachine(config.machines.accountFSM);
        chatFSM = new StateMachine(config.machines.chatFSM);
        dashboardFSM = new StateMachine(config.machines.dashboardFSM);
        marketFSM = new StateMachine(config.machines.marketFSM);
        vi.clearAllMocks();
    });
    describe('Complete Login Flow', () => {
        it('should complete login: idle → submitting → success', async () => {
            const states = [];
            authFSM.subscribe((state) => {
                states.push(state);
            });
            expect(authFSM.getState()).toBe('idle');
            // Simulate user input
            authFSM.send('LOGIN', { email: 'user@example.com', password: 'secret' });
            expect(authFSM.getState()).toBe('submitting');
            // Simulate service response
            authFSM.send('SUCCESS', { token: 'jwt-token' });
            expect(authFSM.getState()).toBe('success');
            expect(states).toContain('idle');
            expect(states).toContain('submitting');
            expect(states).toContain('success');
        });
        it('should handle login error: idle → submitting → error → idle', async () => {
            const states = [];
            authFSM.subscribe((state) => {
                states.push(state);
            });
            authFSM.send('LOGIN');
            expect(authFSM.getState()).toBe('submitting');
            authFSM.send('FAILURE', { error: 'Invalid credentials' });
            expect(authFSM.getState()).toBe('error');
            authFSM.send('RETRY');
            expect(authFSM.getState()).toBe('idle');
            expect(states).toContain('submitting');
            expect(states).toContain('error');
            expect(states).toContain('idle');
        });
        it('should persist login token in context', () => {
            authFSM.send('LOGIN', { email: 'user@example.com' });
            authFSM.send('SUCCESS', { token: 'jwt-token-123', userId: 'user-1' });
            const context = authFSM.getContext();
            expect(context.token).toBeDefined();
            expect(context.userId).toBeDefined();
        });
        it('should allow retry after failed login', (done) => {
            let attemptCount = 0;
            authFSM.subscribe((state) => {
                if (state === 'submitting') {
                    attemptCount++;
                    if (attemptCount === 1) {
                        authFSM.send('FAILURE');
                    }
                    else if (attemptCount === 2) {
                        authFSM.send('SUCCESS');
                        expect(authFSM.getState()).toBe('success');
                        done();
                    }
                }
            });
            authFSM.send('LOGIN');
            authFSM.send('RETRY');
        });
    });
    describe('Account Management Flow', () => {
        it('should view account: loading → viewing', (done) => {
            const states = [];
            accountFSM.subscribe((state) => {
                states.push(state);
                if (state === 'viewing') {
                    expect(states).toContain('loading');
                    expect(states).toContain('viewing');
                    done();
                }
            });
            accountFSM.send('SUCCESS');
        });
        it('should edit account: viewing → editing', (done) => {
            accountFSM.send('SUCCESS'); // viewing state
            let transitions = 0;
            accountFSM.subscribe((state) => {
                transitions++;
                if (transitions === 2) {
                    accountFSM.send('EDIT');
                }
                if (state === 'editing') {
                    expect(state).toBe('editing');
                    done();
                }
            });
        });
        it('should save account changes: editing → saving → viewing', (done) => {
            accountFSM.send('SUCCESS'); // viewing state
            const newData = {
                email: 'newemail@example.com',
                name: 'Jane Doe',
                phone: '+1-555-123-4567',
            };
            let transitions = 0;
            accountFSM.subscribe((state) => {
                transitions++;
                if (transitions === 2) {
                    accountFSM.send('EDIT');
                }
                else if (transitions === 3 && state === 'editing') {
                    accountFSM.send('SAVE', newData);
                }
                else if (transitions === 4 && state === 'saving') {
                    accountFSM.send('SUCCESS');
                }
                else if (transitions === 5 && state === 'viewing') {
                    const context = accountFSM.getContext();
                    expect(context.email).toBeDefined();
                    done();
                }
            });
        });
        it('should cancel edits: editing → viewing (preserving original)', (done) => {
            accountFSM.send('SUCCESS'); // viewing state
            const originalContext = { email: 'original@example.com' };
            let transitions = 0;
            accountFSM.subscribe((state) => {
                transitions++;
                if (transitions === 2) {
                    accountFSM.send('EDIT');
                }
                else if (transitions === 3 && state === 'editing') {
                    accountFSM.send('CANCEL');
                }
                else if (transitions === 4 && state === 'viewing') {
                    expect(state).toBe('viewing');
                    done();
                }
            });
        });
        it('should handle save error: editing → saving → error → editing', (done) => {
            accountFSM.send('SUCCESS'); // viewing state
            let transitions = 0;
            accountFSM.subscribe((state) => {
                transitions++;
                if (transitions === 2) {
                    accountFSM.send('EDIT');
                }
                else if (transitions === 3 && state === 'editing') {
                    accountFSM.send('SAVE');
                }
                else if (transitions === 4 && state === 'saving') {
                    accountFSM.send('FAILURE', { error: 'Network error' });
                }
                else if (transitions === 5 && state === 'error') {
                    expect(state).toBe('error');
                    done();
                }
            });
        });
    });
    describe('Chat Connection Flow', () => {
        it('should connect to chat: idle → loading → connected', (done) => {
            const states = [];
            chatFSM.subscribe((state) => {
                states.push(state);
                if (state === 'connected') {
                    expect(states).toContain('idle');
                    expect(states).toContain('loading');
                    expect(states).toContain('connected');
                    done();
                }
            });
            chatFSM.send('CONNECT', { channel: 'general' });
            chatFSM.send('SUCCESS');
        });
        it('should send messages while connected', (done) => {
            let readyToSend = false;
            chatFSM.subscribe((state) => {
                if (state === 'connected' && !readyToSend) {
                    readyToSend = true;
                    chatFSM.send('SEND_MESSAGE', { text: 'Hello!' });
                }
                if (readyToSend) {
                    expect(chatFSM.getState()).toBe('connected');
                    done();
                }
            });
            chatFSM.send('CONNECT');
            chatFSM.send('SUCCESS');
        });
        it('should disconnect: connected → idle', (done) => {
            let connected = false;
            chatFSM.subscribe((state) => {
                if (state === 'connected' && !connected) {
                    connected = true;
                    chatFSM.send('DISCONNECT');
                }
                if (connected && state === 'idle') {
                    expect(state).toBe('idle');
                    done();
                }
            });
            chatFSM.send('CONNECT');
            chatFSM.send('SUCCESS');
        });
        it('should handle connection error: loading → error → idle', (done) => {
            let attempts = 0;
            chatFSM.subscribe((state) => {
                if (state === 'loading' && attempts === 0) {
                    attempts++;
                    chatFSM.send('FAILURE', { error: 'Connection failed' });
                }
                if (state === 'error') {
                    chatFSM.send('RETRY');
                }
                if (state === 'idle' && attempts > 0) {
                    expect(state).toBe('idle');
                    done();
                }
            });
            chatFSM.send('CONNECT');
        });
        it('should persist session context while connected', (done) => {
            chatFSM.subscribe((state) => {
                if (state === 'connected') {
                    const context = chatFSM.getContext();
                    expect(context).toBeDefined();
                    done();
                }
            });
            chatFSM.send('CONNECT', { channel: 'general', userId: 'user-1' });
            chatFSM.send('SUCCESS', { sessionId: 'session-123' });
        });
    });
    describe('Dashboard Load Flow', () => {
        it('should load dashboard: idle → loading → loaded', (done) => {
            const states = [];
            dashboardFSM.subscribe((state) => {
                states.push(state);
                if (state === 'loaded') {
                    expect(states).toContain('idle');
                    expect(states).toContain('loading');
                    expect(states).toContain('loaded');
                    done();
                }
            });
            dashboardFSM.send('LOAD');
            dashboardFSM.send('SUCCESS');
        });
        it('should handle load error: loading → error → idle', (done) => {
            dashboardFSM.subscribe((state) => {
                if (state === 'loading') {
                    dashboardFSM.send('FAILURE');
                }
                if (state === 'error') {
                    dashboardFSM.send('RELOAD');
                    expect(dashboardFSM.getState()).toBe('idle');
                    done();
                }
            });
            dashboardFSM.send('LOAD');
        });
        it('should reload dashboard data', (done) => {
            dashboardFSM.subscribe((state) => {
                if (state === 'loaded') {
                    dashboardFSM.send('RELOAD');
                    expect(dashboardFSM.getState()).toBe('loading');
                    done();
                }
            });
            dashboardFSM.send('LOAD');
            dashboardFSM.send('SUCCESS');
        });
    });
    describe('Market Data Flow', () => {
        it('should view market data: idle → loading → loaded', (done) => {
            const states = [];
            marketFSM.subscribe((state) => {
                states.push(state);
                if (state === 'loaded') {
                    expect(states).toContain('idle');
                    expect(states).toContain('loading');
                    expect(states).toContain('loaded');
                    done();
                }
            });
            marketFSM.send('VIEW');
            marketFSM.send('SUCCESS');
        });
        it('should filter market data without reload', (done) => {
            marketFSM.subscribe((state) => {
                if (state === 'loaded') {
                    const stateBefore = marketFSM.getState();
                    marketFSM.send('FILTER', { symbol: 'AAPL' });
                    const stateAfter = marketFSM.getState();
                    expect(stateBefore).toBe(stateAfter);
                    done();
                }
            });
            marketFSM.send('VIEW');
            marketFSM.send('SUCCESS');
        });
        it('should reload market data: loaded → loading → loaded', (done) => {
            let reloaded = false;
            marketFSM.subscribe((state) => {
                if (state === 'loaded' && !reloaded) {
                    reloaded = true;
                    marketFSM.send('RELOAD');
                    expect(marketFSM.getState()).toBe('loading');
                }
                if (reloaded && state === 'loaded') {
                    done();
                }
            });
            marketFSM.send('VIEW');
            marketFSM.send('SUCCESS');
        });
    });
    describe('Multi-FSM Interaction', () => {
        it('should handle simultaneous auth and dashboard loading', (done) => {
            const states = {
                auth: [],
                dashboard: [],
            };
            authFSM.subscribe((state) => {
                states.auth.push(state);
            });
            dashboardFSM.subscribe((state) => {
                states.dashboard.push(state);
            });
            authFSM.send('LOGIN');
            dashboardFSM.send('LOAD');
            expect(authFSM.getState()).toBe('submitting');
            expect(dashboardFSM.getState()).toBe('loading');
            authFSM.send('SUCCESS');
            dashboardFSM.send('SUCCESS');
            expect(authFSM.getState()).toBe('success');
            expect(dashboardFSM.getState()).toBe('loaded');
            done();
        });
        it('should allow chat connection after login success', (done) => {
            authFSM.subscribe((state) => {
                if (state === 'success') {
                    chatFSM.send('CONNECT', { userId: authFSM.getContext().userId });
                }
            });
            chatFSM.subscribe((state) => {
                if (state === 'connected') {
                    expect(authFSM.getState()).toBe('success');
                    expect(chatFSM.getState()).toBe('connected');
                    done();
                }
            });
            authFSM.send('LOGIN');
            authFSM.send('SUCCESS');
            chatFSM.send('SUCCESS');
        });
        it('should maintain market data while chatting', (done) => {
            marketFSM.subscribe((state) => {
                if (state === 'loaded') {
                    chatFSM.send('CONNECT');
                    chatFSM.send('SUCCESS');
                }
            });
            chatFSM.subscribe((state) => {
                if (state === 'connected') {
                    expect(marketFSM.getState()).toBe('loaded');
                    chatFSM.send('SEND_MESSAGE');
                    expect(chatFSM.getState()).toBe('connected');
                    expect(marketFSM.getState()).toBe('loaded');
                    done();
                }
            });
            marketFSM.send('VIEW');
            marketFSM.send('SUCCESS');
        });
    });
    describe('Error Recovery Flows', () => {
        it('should recover from auth failure and retry', (done) => {
            let attempts = 0;
            authFSM.subscribe((state) => {
                if (state === 'error') {
                    attempts++;
                    authFSM.send('RETRY');
                }
                if (state === 'submitting' && attempts >= 1) {
                    authFSM.send('SUCCESS');
                }
                if (state === 'success') {
                    expect(attempts).toBeGreaterThanOrEqual(1);
                    done();
                }
            });
            authFSM.send('LOGIN');
            authFSM.send('FAILURE');
        });
        it('should recover from network timeout', (done) => {
            dashboardFSM.subscribe((state) => {
                if (state === 'loading') {
                    dashboardFSM.send('FAILURE', { error: 'Timeout' });
                }
                if (state === 'error') {
                    dashboardFSM.send('RELOAD');
                }
                if (state === 'loading' && dashboardFSM.getState() !== 'loading') {
                    // Second load attempt
                    dashboardFSM.send('SUCCESS');
                }
                if (state === 'loaded') {
                    done();
                }
            });
            dashboardFSM.send('LOAD');
        });
    });
});
//# sourceMappingURL=integration.test.js.map