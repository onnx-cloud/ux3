/**
 * IAM FSM Tests
 * Unit tests for IAM application state machines
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { StateMachine } from '@ux3/fsm';
import { config } from '../../examples/iam/generated/config';
describe('IAM FSMs', () => {
    describe('Auth FSM (login flow)', () => {
        let fsm;
        beforeEach(() => {
            const authConfig = config.machines.authFSM;
            fsm = new StateMachine(authConfig);
        });
        it('should initialize in idle state', () => {
            expect(fsm.getState()).toBe('idle');
        });
        it('should transition from idle to submitting on LOGIN event', () => {
            fsm.send('LOGIN');
            expect(fsm.getState()).toBe('submitting');
        });
        it('should transition from submitting to success on SUCCESS event', () => {
            fsm.send('LOGIN');
            fsm.send('SUCCESS');
            expect(fsm.getState()).toBe('success');
        });
        it('should transition from submitting to error on FAILURE event', () => {
            fsm.send('LOGIN');
            fsm.send('FAILURE');
            expect(fsm.getState()).toBe('error');
        });
        it('should return to idle from error on RETRY event', () => {
            fsm.send('LOGIN');
            fsm.send('FAILURE');
            expect(fsm.getState()).toBe('error');
            fsm.send('RETRY');
            expect(fsm.getState()).toBe('idle');
        });
        it('should ignore invalid events in current state', () => {
            expect(fsm.getState()).toBe('idle');
            fsm.send('SUCCESS'); // Invalid in idle state
            expect(fsm.getState()).toBe('idle'); // Should stay in idle
        });
        it('should track context', () => {
            const ctx = fsm.getContext();
            expect(ctx).toBeDefined();
        });
        it('should allow context updates', () => {
            fsm.setState({ email: 'user@example.com', attempts: 1 });
            const ctx = fsm.getContext();
            expect(ctx.email).toBe('user@example.com');
            expect(ctx.attempts).toBe(1);
        });
        it('should notify subscribers on state change', (done) => {
            let changeCount = 0;
            fsm.subscribe((state) => {
                changeCount++;
                if (changeCount === 2) { // Skip initial subscription
                    expect(state).toBe('submitting');
                    done();
                }
            });
            fsm.send('LOGIN');
        });
    });
    describe('Account ', () => {
        let fsm;
        beforeEach(() => {
            const accountConfig = config.machines.accountFSM;
            fsm = new StateMachine(accountConfig);
        });
        it('should start in loading state', () => {
            expect(fsm.getState()).toBe('loading');
        });
        it('should transition loading → viewing on SUCCESS', () => {
            fsm.send('SUCCESS');
            expect(fsm.getState()).toBe('viewing');
        });
        it('should transition loading → error on ERROR', () => {
            fsm.send('ERROR');
            expect(fsm.getState()).toBe('error');
        });
        it('should transition viewing → editing on EDIT', () => {
            fsm.send('SUCCESS');
            fsm.send('EDIT');
            expect(fsm.getState()).toBe('editing');
        });
        it('should transition editing → saving on SAVE', () => {
            fsm.send('SUCCESS');
            fsm.send('EDIT');
            fsm.send('SAVE');
            expect(fsm.getState()).toBe('saving');
        });
        it('should transition editing → viewing on CANCEL', () => {
            fsm.send('SUCCESS');
            fsm.send('EDIT');
            fsm.send('CANCEL');
            expect(fsm.getState()).toBe('viewing');
        });
        it('should transition error → loading on RETRY', () => {
            fsm.send('ERROR');
            fsm.send('RETRY');
            expect(fsm.getState()).toBe('loading');
        });
        it('should complete full edit cycle', () => {
            // Load
            fsm.send('SUCCESS');
            expect(fsm.getState()).toBe('viewing');
            // Edit
            fsm.send('EDIT');
            expect(fsm.getState()).toBe('editing');
            // Save
            fsm.send('SAVE');
            expect(fsm.getState()).toBe('saving');
            // Success
            fsm.send('SUCCESS');
            expect(fsm.getState()).toBe('viewing');
        });
    });
    describe('Chat ', () => {
        let fsm;
        beforeEach(() => {
            const chatConfig = config.machines.chatFSM;
            fsm = new StateMachine(chatConfig);
        });
        it('should initialize in idle state', () => {
            expect(fsm.getState()).toBe('idle');
        });
        it('should transition idle → loading on CONNECT', () => {
            fsm.send('CONNECT');
            expect(fsm.getState()).toBe('loading');
        });
        it('should transition loading → connected on SUCCESS', () => {
            fsm.send('CONNECT');
            fsm.send('SUCCESS');
            expect(fsm.getState()).toBe('connected');
        });
        it('should transition loading → error on FAILURE', () => {
            fsm.send('CONNECT');
            fsm.send('FAILURE');
            expect(fsm.getState()).toBe('error');
        });
        it('should transition connected → idle on DISCONNECT', () => {
            fsm.send('CONNECT');
            fsm.send('SUCCESS');
            fsm.send('DISCONNECT');
            expect(fsm.getState()).toBe('idle');
        });
        it('should allow messaging in connected state', () => {
            fsm.send('CONNECT');
            fsm.send('SUCCESS');
            expect(fsm.getState()).toBe('connected');
            // Should accept SEND_MESSAGE without state change
            const stateBefore = fsm.getState();
            fsm.send('SEND_MESSAGE');
            expect(fsm.getState()).toBe(stateBefore);
        });
    });
    describe('Dashboard ', () => {
        let fsm;
        beforeEach(() => {
            const dashboardConfig = config.machines.dashboardFSM;
            fsm = new StateMachine(dashboardConfig);
        });
        it('should start in idle state', () => {
            expect(fsm.getState()).toBe('idle');
        });
        it('should transition idle → loading on LOAD', () => {
            fsm.send('LOAD');
            expect(fsm.getState()).toBe('loading');
        });
        it('should transition loading → loaded on SUCCESS', () => {
            fsm.send('LOAD');
            fsm.send('SUCCESS');
            expect(fsm.getState()).toBe('loaded');
        });
        it('should transition loading → error on FAILURE', () => {
            fsm.send('LOAD');
            fsm.send('FAILURE');
            expect(fsm.getState()).toBe('error');
        });
        it('should reload from loaded state', () => {
            fsm.send('LOAD');
            fsm.send('SUCCESS');
            expect(fsm.getState()).toBe('loaded');
            fsm.send('LOAD');
            expect(fsm.getState()).toBe('loading');
        });
    });
    describe('Market ', () => {
        let fsm;
        beforeEach(() => {
            const marketConfig = config.machines.marketFSM;
            fsm = new StateMachine(marketConfig);
        });
        it('should initialize in idle state', () => {
            expect(fsm.getState()).toBe('idle');
        });
        it('should support filter changes in idle state', () => {
            fsm.send('FILTER');
            expect(fsm.getState()).toBe('idle');
        });
        it('should transition idle → loading on VIEW', () => {
            fsm.send('VIEW');
            expect(fsm.getState()).toBe('loading');
        });
        it('should transition loading → loaded on SUCCESS', () => {
            fsm.send('VIEW');
            fsm.send('SUCCESS');
            expect(fsm.getState()).toBe('loaded');
        });
    });
});
//# sourceMappingURL=fsms.test.js.map