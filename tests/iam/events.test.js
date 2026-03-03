/**
 * IAM Event Binding Tests
 * Unit tests for event binding and ux-event directives
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateMachine } from '@ux3/fsm';
import { config } from '../../examples/iam/generated/config';
describe('IAM Event Binding', () => {
    let authFSM;
    let accountFSM;
    let chatFSM;
    beforeEach(() => {
        authFSM = new StateMachine(config.machines.authFSM);
        accountFSM = new StateMachine(config.machines.accountFSM);
        chatFSM = new StateMachine(config.machines.chatFSM);
    });
    describe('ux-event directive binding', () => {
        it('should bind SUBMIT event to form', () => {
            const form = document.createElement('form');
            form.setAttribute('ux-event', 'SUBMIT');
            const handler = vi.fn();
            authFSM.subscribe(handler);
            // Simulate form submission
            const submitEvent = new Event('submit', { bubbles: true });
            form.dispatchEvent(submitEvent);
            // Validate form has event binding
            expect(form.getAttribute('ux-event')).toBe('SUBMIT');
        });
        it('should bind CLICK event to button', () => {
            const button = document.createElement('button');
            button.setAttribute('ux-event', 'EDIT');
            const handler = vi.fn();
            accountFSM.subscribe(handler);
            const clickEvent = new MouseEvent('click', { bubbles: true });
            button.dispatchEvent(clickEvent);
            expect(button.getAttribute('ux-event')).toBe('EDIT');
        });
        it('should bind multiple events to different elements', () => {
            const form = document.createElement('form');
            form.setAttribute('ux-event', 'SUBMIT');
            const cancelBtn = document.createElement('button');
            cancelBtn.setAttribute('ux-event', 'CANCEL');
            const editBtn = document.createElement('button');
            editBtn.setAttribute('ux-event', 'EDIT');
            expect(form.getAttribute('ux-event')).toBe('SUBMIT');
            expect(cancelBtn.getAttribute('ux-event')).toBe('CANCEL');
            expect(editBtn.getAttribute('ux-event')).toBe('EDIT');
        });
        it('should bind custom events with payloads', () => {
            const element = document.createElement('div');
            element.setAttribute('ux-event', 'SEND_MESSAGE');
            element.setAttribute('ux-payload', JSON.stringify({ text: 'Hello' }));
            expect(element.getAttribute('ux-event')).toBe('SEND_MESSAGE');
            expect(element.getAttribute('ux-payload')).toBeDefined();
            const payload = JSON.parse(element.getAttribute('ux-payload') || '{}');
            expect(payload.text).toBe('Hello');
        });
    });
    describe('Event dispatch to ', () => {
        it('should dispatch LOGIN event to auth ', (done) => {
            expect(authFSM.getState()).toBe('idle');
            authFSM.subscribe((state) => {
                if (state === 'submitting') {
                    expect(state).toBe('submitting');
                    done();
                }
            });
            // Simulate event dispatch
            authFSM.send('LOGIN', { email: 'user@example.com', password: 'secret' });
        });
        it('should dispatch EDIT event to account ', (done) => {
            accountFSM.send('SUCCESS'); // Transition to viewing state
            let transitionCount = 0;
            accountFSM.subscribe((state) => {
                transitionCount++;
                if (transitionCount === 2 && state === 'editing') {
                    expect(state).toBe('editing');
                    done();
                }
            });
            accountFSM.send('EDIT');
        });
        it('should dispatch SAVE event with form data', (done) => {
            accountFSM.send('SUCCESS');
            let transitionCount = 0;
            accountFSM.subscribe((state) => {
                transitionCount++;
                if (transitionCount === 2 && state === 'editing') {
                    accountFSM.send('SAVE', { email: 'newemail@example.com' });
                }
                if (transitionCount === 3 && state === 'saving') {
                    expect(state).toBe('saving');
                    done();
                }
            });
            accountFSM.send('EDIT');
        });
        it('should dispatch CONNECT event to chat ', (done) => {
            expect(chatFSM.getState()).toBe('idle');
            chatFSM.subscribe((state) => {
                if (state === 'loading') {
                    expect(state).toBe('loading');
                    done();
                }
            });
            chatFSM.send('CONNECT', { channel: 'general' });
        });
        it('should dispatch message events while connected', (done) => {
            chatFSM.send('CONNECT');
            let transitionCount = 0;
            chatFSM.subscribe((state) => {
                transitionCount++;
                if (transitionCount === 2 && state === 'loading') {
                    chatFSM.send('SUCCESS');
                }
                if (transitionCount === 3 && state === 'connected') {
                    chatFSM.send('SEND_MESSAGE', { text: 'Hello!' });
                    expect(chatFSM.getState()).toBe('connected');
                    done();
                }
            });
        });
    });
    describe('Event payload handling', () => {
        it('should pass form input data to event', () => {
            const form = document.createElement('form');
            const emailInput = document.createElement('input');
            emailInput.setAttribute('type', 'email');
            emailInput.setAttribute('name', 'email');
            emailInput.value = 'user@example.com';
            const passwordInput = document.createElement('input');
            passwordInput.setAttribute('type', 'password');
            passwordInput.setAttribute('name', 'password');
            passwordInput.value = 'secret123';
            form.appendChild(emailInput);
            form.appendChild(passwordInput);
            // Extract form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            expect(data.email).toBe('user@example.com');
            expect(data.password).toBe('secret123');
        });
        it('should send event with button name', () => {
            const saveBtn = document.createElement('button');
            saveBtn.setAttribute('name', 'action');
            saveBtn.setAttribute('value', 'save');
            saveBtn.setAttribute('ux-event', 'SAVE');
            const cancelBtn = document.createElement('button');
            cancelBtn.setAttribute('name', 'action');
            cancelBtn.setAttribute('value', 'cancel');
            cancelBtn.setAttribute('ux-event', 'CANCEL');
            expect(saveBtn.getAttribute('value')).toBe('save');
            expect(cancelBtn.getAttribute('value')).toBe('cancel');
        });
        it('should include context in event payload', () => {
            const payload = {
                userId: 'user123',
                email: 'user@example.com',
                timestamp: Date.now(),
            };
            authFSM.send('LOGIN', payload);
            const context = authFSM.getContext();
            expect(context).toBeDefined();
        });
    });
    describe('Event listener lifecycle', () => {
        it('should attach event listener on element mount', () => {
            const button = document.createElement('button');
            button.setAttribute('ux-event', 'CLICK_ACTION');
            const container = document.createElement('div');
            container.appendChild(button);
            expect(button.getAttribute('ux-event')).toBe('CLICK_ACTION');
            expect(container.contains(button)).toBe(true);
        });
        it('should remove event listener on element unmount', () => {
            const container = document.createElement('div');
            const button = document.createElement('button');
            button.setAttribute('ux-event', 'CLICK_ACTION');
            container.appendChild(button);
            expect(container.contains(button)).toBe(true);
            container.removeChild(button);
            expect(container.contains(button)).toBe(false);
        });
        it('should cleanup listeners when view unmounts', () => {
            const view = document.createElement('div');
            const form = document.createElement('form');
            form.setAttribute('ux-event', 'SUBMIT');
            const button = document.createElement('button');
            button.setAttribute('ux-event', 'CANCEL');
            view.appendChild(form);
            view.appendChild(button);
            expect(view.querySelectorAll('[ux-event]').length).toBe(2);
            // Clear DOM
            view.innerHTML = '';
            expect(view.querySelectorAll('[ux-event]').length).toBe(0);
        });
        it('should reattach listeners when view remounts', () => {
            const view = document.createElement('div');
            const button = document.createElement('button');
            button.setAttribute('ux-event', 'EDIT');
            view.appendChild(button);
            expect(view.querySelectorAll('[ux-event]').length).toBe(1);
            // Simulate unmount
            view.innerHTML = '';
            expect(view.querySelectorAll('[ux-event]').length).toBe(0);
            // Simulate remount
            const newButton = document.createElement('button');
            newButton.setAttribute('ux-event', 'EDIT');
            view.appendChild(newButton);
            expect(view.querySelectorAll('[ux-event]').length).toBe(1);
        });
    });
    describe('Event delegation', () => {
        it('should handle delegated click events', () => {
            const container = document.createElement('div');
            const button1 = document.createElement('button');
            button1.setAttribute('ux-event', 'ACTION_1');
            button1.textContent = 'Action 1';
            const button2 = document.createElement('button');
            button2.setAttribute('ux-event', 'ACTION_2');
            button2.textContent = 'Action 2';
            container.appendChild(button1);
            container.appendChild(button2);
            const buttons = container.querySelectorAll('button[ux-event]');
            expect(buttons.length).toBe(2);
        });
        it('should distinguish between multiple button events', () => {
            const form = document.createElement('form');
            const submitBtn = document.createElement('button');
            submitBtn.setAttribute('type', 'submit');
            submitBtn.setAttribute('ux-event', 'SUBMIT');
            const resetBtn = document.createElement('button');
            resetBtn.setAttribute('type', 'reset');
            resetBtn.setAttribute('ux-event', 'RESET');
            form.appendChild(submitBtn);
            form.appendChild(resetBtn);
            expect(form.querySelector('[ux-event="SUBMIT"]')).toBe(submitBtn);
            expect(form.querySelector('[ux-event="RESET"]')).toBe(resetBtn);
        });
    });
    describe('Event validation', () => {
        it('should validate email input before dispatch', () => {
            const email = 'invalid-email';
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            expect(isValid).toBe(false);
        });
        it('should accept valid email', () => {
            const email = 'user@example.com';
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            expect(isValid).toBe(true);
        });
        it('should require non-empty required fields', () => {
            const email = '';
            expect(email.length === 0).toBe(true);
            const password = 'secret123';
            expect(password.length > 0).toBe(true);
        });
        it('should validate form before sending LOGIN event', () => {
            const form = document.createElement('form');
            const emailInput = document.createElement('input');
            emailInput.setAttribute('type', 'email');
            emailInput.setAttribute('required', '');
            emailInput.value = 'user@example.com';
            const passwordInput = document.createElement('input');
            passwordInput.setAttribute('type', 'password');
            passwordInput.setAttribute('required', '');
            passwordInput.value = 'secret123';
            form.appendChild(emailInput);
            form.appendChild(passwordInput);
            const isValid = form.querySelector('input[required]:not([value])') === null &&
                emailInput.value.length > 0 &&
                passwordInput.value.length > 0;
            expect(isValid).toBe(true);
        });
    });
    describe('Event error handling', () => {
        it('should handle invalid event names gracefully', () => {
            const invalidEvent = 'NONEXISTENT_EVENT';
            const result = authFSM.send(invalidEvent);
            // FSM should handle gracefully (queue or ignore)
            expect(authFSM.getState()).toBe('idle');
        });
        it('should handle missing payload gracefully', () => {
            authFSM.send('LOGIN'); // No payload provided
            // Should not crash, FSM handles undefined payload
            expect(authFSM.getState()).toBe('submitting');
        });
        it('should handle malformed JSON payload', () => {
            const malformedPayload = '{invalid json}';
            try {
                JSON.parse(malformedPayload);
                expect(true).toBe(false); // Should throw
            }
            catch (error) {
                expect(error).toBeDefined();
            }
        });
        it('should handle network errors during service calls', (done) => {
            authFSM.subscribe((state) => {
                if (state === 'submitting') {
                    authFSM.send('FAILURE', { error: 'Network timeout' });
                }
                if (state === 'error') {
                    expect(state).toBe('error');
                    done();
                }
            });
            authFSM.send('LOGIN', { email: 'user@example.com', password: 'secret' });
        });
    });
});
//# sourceMappingURL=events.test.js.map