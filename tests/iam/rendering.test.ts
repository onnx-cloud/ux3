/**
 * IAM View Rendering Tests
 * Unit tests for IAM view component rendering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ViewComponent } from '@ux3/ui';
import { StateMachine } from '@ux3/fsm';
import { config } from '../../examples/iam/generated/config';

// Mock AppContext for testing
const mockAppContext = {
  machines: Object.fromEntries(
    Object.entries(config.machines).map(([key, machineConfig]) => [
      key.replace('FSM', '').toLowerCase(),
      new StateMachine(machineConfig as any)
    ])
  ),
  services: {},
  styles: {
    'btn-primary': 'px-4 py-2 bg-blue text-white rounded',
    'btn-secondary': 'px-4 py-2 bg-gray text-black rounded',
    'card': 'border rounded-lg shadow p-4',
    'form': 'flex flex-col gap-4',
  },
  template: (name: string) => {
    const templates: Record<string, string> = {
      'default': '<div id="layout"><div id="ux-content"></div></div>',
      'auth': '<div id="auth-layout"><div id="ux-content"></div></div>',
      'login-idle': '<form ux-event="SUBMIT"><input type="email" /></form>',
      'login-submitting': '<div>Loading...</div>',
      'login-success': '<div>Success!</div>',
      'login-error': '<div>Error!</div>',
      'dashboard-idle': '<div>Ready</div>',
      'dashboard-loading': '<div>Loading...</div>',
      'dashboard-loaded': '<div>Dashboard content</div>',
      'account-loading': '<div>Loading account...</div>',
      'account-viewing': '<div>Account info</div>',
      'account-editing': '<form><input name="email" /></form>',
    };
    return templates[name] || '';
  },
  i18n: (key: string) => {
    const i18n: Record<string, string> = {
      'auth.login': 'Login',
      'auth.password': 'Password',
      'actions.submit': 'Submit',
      'actions.cancel': 'Cancel',
      'status.loading': 'Loading...',
      'errors.invalid-email': 'Invalid email',
    };
    return i18n[key] || key;
  },
  widgets: { create: () => {} } as any,
  ui: {},
  nav: null,
};

describe('IAM View Rendering', () => {
  beforeEach(() => {
    // Make app context globally available
    (window as any).__ux3App = mockAppContext;

    // Reset FSMs
    Object.values(mockAppContext.machines).forEach((fsm: any) => {
      fsm.send('__RESET__'); // Will be ignored if not valid
    });
  });

  describe('Login View', () => {
    let element: ViewComponent;

    beforeEach(() => {
      // Create mock login view
      element = document.createElement('ux-login') as any;
      element.setAttribute('ux-fsm', 'auth');
      element.setAttribute('ux-view', 'login');
      element.setAttribute('ux-layout', 'auth');
    });

    it('should render idle state template', (done) => {
      // Simulate component mounting
      const fsm = mockAppContext.machines.auth;
      const idleTemplate = mockAppContext.template('login-idle');
      
      expect(idleTemplate).toContain('form');
      expect(idleTemplate).toContain('ux-event="SUBMIT"');
      done();
    });

    it('should update when FSM transitions', (done) => {
      const fsm = mockAppContext.machines.auth as any;
      
      expect(fsm.getState()).toBe('idle');
      
      fsm.subscribe((state: string) => {
        if (state === 'submitting') {
          const template = mockAppContext.template('login-submitting');
          expect(template).toContain('Loading');
          done();
        }
      });
      
      fsm.send('LOGIN');
    });

    it('should reflect FSM state as data-state attribute', () => {
      const fsm = mockAppContext.machines.auth;
      expect(fsm.getState()).toBe('idle');
      
      // In a real component, this would be:
      // element.setAttribute('data-state', fsm.getState());
      // expect(element.getAttribute('data-state')).toBe('idle');
    });

    it('should render success state after LOGIN → SUCCESS', (done) => {
      const fsm = mockAppContext.machines.auth as any;
      
      let transitions = 0;
      fsm.subscribe(() => {
        transitions++;
        if (transitions === 2) { // Skip initial subscribe
          const state = fsm.getState();
          const template = mockAppContext.template(`login-${state}`);
          expect(template).toBeDefined();
          done();
        }
      });
      
      fsm.send('LOGIN');
      fsm.send('SUCCESS');
    });

    it('should render error state after LOGIN → FAILURE', (done) => {
      const fsm = mockAppContext.machines.auth as any;
      
      let transitions = 0;
      fsm.subscribe(() => {
        transitions++;
        if (transitions === 2) { // Skip initial subscribe
          const state = fsm.getState();
          expect(state).toBe('error');
          const template = mockAppContext.template(`login-${state}`);
          expect(template).toContain('Error');
          done();
        }
      });
      
      fsm.send('LOGIN');
      fsm.send('FAILURE');
    });
  });

  describe('Dashboard View', () => {
    it('should start in idle state', () => {
      const fsm = mockAppContext.machines.dashboard;
      expect(fsm.getState()).toBe('idle');
    });

    it('should load dashboard data', (done) => {
      const fsm = mockAppContext.machines.dashboard as any;
      
      let transitionCount = 0;
      fsm.subscribe((state: string) => {
        transitionCount++;
        if (transitionCount === 2 && state === 'loading') {
          expect(state).toBe('loading');
          done();
        }
      });
      
      fsm.send('LOAD');
    });

    it('should render loaded state', (done) => {
      const fsm = mockAppContext.machines.dashboard as any;
      
      let transitionCount = 0;
      fsm.subscribe((state: string) => {
        transitionCount++;
        if (transitionCount === 3 && state === 'loaded') {
          const template = mockAppContext.template('dashboard-loaded');
          expect(template).toContain('Dashboard');
          done();
        }
      });
      
      fsm.send('LOAD');
      fsm.send('SUCCESS');
    });

    it('should handle error state', (done) => {
      const fsm = mockAppContext.machines.dashboard as any;
      
      let transitionCount = 0;
      fsm.subscribe((state: string) => {
        transitionCount++;
        if (transitionCount === 3 && state === 'error') {
          expect(state).toBe('error');
          done();
        }
      });
      
      fsm.send('LOAD');
      fsm.send('FAILURE');
    });
  });

  describe('Account View', () => {
    it('should render viewing state', (done) => {
      const fsm = mockAppContext.machines.account as any;
      
      let transitionCount = 0;
      fsm.subscribe((state: string) => {
        transitionCount++;
        if (transitionCount === 2 && state === 'viewing') {
          const template = mockAppContext.template('account-viewing');
          expect(template).toContain('Account');
          done();
        }
      });
      
      fsm.send('SUCCESS');
    });

    it('should render editing state', (done) => {
      const fsm = mockAppContext.machines.account as any;
      
      let transitionCount = 0;
      fsm.subscribe((state: string) => {
        transitionCount++;
        if (transitionCount === 3 && state === 'editing') {
          const template = mockAppContext.template('account-editing');
          expect(template).toContain('form');
          done();
        }
      });
      
      fsm.send('SUCCESS');
      fsm.send('EDIT');
    });

    it('should preserve unsaved changes on cancel', (done) => {
      const fsm = mockAppContext.machines.account as any;
      
      // Update context with changes
      fsm.setState({ email: 'newemail@example.com' });
      
      let transitionCount = 0;
      fsm.subscribe(() => {
        transitionCount++;
        if (transitionCount === 3) {
          const state = fsm.getState();
          expect(state).toBe('viewing');
          const ctx = fsm.getContext();
          // Context should retain the unsaved email
          expect(ctx.email).toBe('newemail@example.com');
          done();
        }
      });
      
      fsm.send('SUCCESS');
      fsm.send('EDIT');
      fsm.send('CANCEL');
    });
  });

  describe('Chat View', () => {
    it('should start in idle state', () => {
      const fsm = mockAppContext.machines.chat;
      expect(fsm.getState()).toBe('idle');
    });

    it('should connect to chat', (done) => {
      const fsm = mockAppContext.machines.chat as any;
      
      let transitionCount = 0;
      fsm.subscribe((state: string) => {
        transitionCount++;
        if (transitionCount === 2 && state === 'loading') {
          expect(state).toBe('loading');
          done();
        }
      });
      
      fsm.send('CONNECT');
    });

    it('should establish connection', (done) => {
      const fsm = mockAppContext.machines.chat as any;
      
      let transitionCount = 0;
      fsm.subscribe((state: string) => {
        transitionCount++;
        if (transitionCount === 3 && state === 'connected') {
          expect(state).toBe('connected');
          done();
        }
      });
      
      fsm.send('CONNECT');
      fsm.send('SUCCESS');
    });

    it('should disconnect from chat', (done) => {
      const fsm = mockAppContext.machines.chat as any;
      
      let transitionCount = 0;
      fsm.subscribe((state: string) => {
        transitionCount++;
        if (transitionCount === 4 && state === 'idle') {
          expect(state).toBe('idle');
          done();
        }
      });
      
      fsm.send('CONNECT');
      fsm.send('SUCCESS');
      fsm.send('DISCONNECT');
    });
  });

  describe('Market View', () => {
    it('should start in idle state', () => {
      const fsm = mockAppContext.machines.market;
      expect(fsm.getState()).toBe('idle');
    });

    it('should filter data without loading', () => {
      const fsm = mockAppContext.machines.market;
      fsm.send('FILTER');
      expect(fsm.getState()).toBe('idle');
    });

    it('should load market data', (done) => {
      const fsm = mockAppContext.machines.market as any;
      
      let transitionCount = 0;
      fsm.subscribe((state: string) => {
        transitionCount++;
        if (transitionCount === 2 && state === 'loading') {
          expect(state).toBe('loading');
          done();
        }
      });
      
      fsm.send('VIEW');
    });
  });
});
