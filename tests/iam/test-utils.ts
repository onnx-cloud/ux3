/**
 * IAM Test Configuration & Utilities
 * Shared setup, fixtures, and helpers for IAM tests
 */

import { beforeEach, afterEach, vi } from 'vitest';
import { StateMachine } from '../../src/fsm';
import { FSMRegistry } from '../../src/fsm';

/**
 * Global test setup
 * Runs before all IAM tests
 */
export function setupIAMTestEnvironment() {
  // Clear FSM registry before each test suite
  beforeEach(() => {
    FSMRegistry.clear?.();
  });

  // Cleanup after each test
  afterEach(() => {
    vi.clearAllMocks();
  });
}

/**
 * Helper to create FSM with test configuration
 * @param machineConfig - FSM configuration object
 * @returns Fresh StateMachine instance
 */
export function createTestFSM<T = any>(machineConfig: any): StateMachine<T> {
  return new StateMachine(machineConfig);
}

/**
 * Helper to wait for FSM state change
 * @param fsm - StateMachine instance
 * @param targetState - Expected state to wait for
 * @param timeoutMs - Timeout in milliseconds (default: 1000)
 * @returns Promise resolving when state reached or rejecting on timeout
 */
export function waitForState(
  fsm: StateMachine<any>,
  targetState: string,
  timeoutMs = 1000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for state: ${targetState}`));
    }, timeoutMs);

    const unsubscribe = fsm.subscribe((state) => {
      if (state === targetState) {
        clearTimeout(timeout);
        unsubscribe?.();
        resolve(state);
      }
    });

    // Check if already in target state
    if (fsm.getState() === targetState) {
      clearTimeout(timeout);
      unsubscribe?.();
      resolve(targetState);
    }
  });
}

/**
 * Helper to collect all state transitions
 * @param fsm - StateMachine instance
 * @param duration - Duration to collect transitions (ms)
 * @returns Promise resolving to array of states visited
 */
export function collectTransitions(
  fsm: StateMachine<any>,
  duration = 100
): Promise<string[]> {
  return new Promise((resolve) => {
    const states: string[] = [fsm.getState()];

    const unsubscribe = fsm.subscribe((state) => {
      states.push(state);
    });

    setTimeout(() => {
      unsubscribe?.();
      resolve(states);
    }, duration);
  });
}

/**
 * Helper to create mock service
 * @param methods - Service method implementations
 * @returns Mock service object with vitest spy tracking
 */
export function createMockService(methods: Record<string, vi.Mock>) {
  return Object.entries(methods).reduce(
    (acc, [key, fn]) => {
      acc[key] = vi.fn(fn);
      return acc;
    },
    {} as Record<string, vi.Mock>
  );
}

/**
 * Helper to assert FSM transition is valid
 * @param fsm - StateMachine instance
 * @param fromState - Source state
 * @param event - Event to send
 * @param expectedState - Expected resulting state
 */
export function assertTransition(
  fsm: StateMachine<any>,
  fromState: string,
  event: string,
  expectedState: string
) {
  if (fsm.getState() !== fromState) {
    throw new Error(
      `Expected FSM in state "${fromState}", got "${fsm.getState()}"`
    );
  }

  fsm.send(event);

  if (fsm.getState() !== expectedState) {
    throw new Error(
      `Expected transition from "${fromState}" via "${event}" to "${expectedState}", got "${fsm.getState()}"`
    );
  }
}

/**
 * Helper to create form with inputs
 * @param fields - Form field definitions
 * @returns HTMLFormElement with inputs
 */
export function createTestForm(
  fields: Record<string, { type: string; value: string }>
): HTMLFormElement {
  const form = document.createElement('form');

  Object.entries(fields).forEach(([name, { type, value }]) => {
    const input = document.createElement('input');
    input.setAttribute('type', type);
    input.setAttribute('name', name);
    input.value = value;
    form.appendChild(input);
  });

  return form;
}

/**
 * Helper to extract form data as object
 * @param form - HTMLFormElement
 * @returns Form data as Record<string, string>
 */
export function getFormData(form: HTMLFormElement): Record<string, string> {
  const formData = new FormData(form);
  return Object.fromEntries(formData);
}

/**
 * Helper to validate email format
 * @param email - Email string to validate
 * @returns true if valid email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Test data factories for IAM
 */
export const testData = {
  /**
   * Valid user credentials
   */
  validUser: {
    email: 'user@example.com',
    password: 'Password123!',
  },

  /**
   * Invalid user credentials
   */
  invalidUser: {
    email: 'invalid-email',
    password: '',
  },

  /**
   * Sample user profile
   */
  userProfile: {
    id: 'user-1',
    email: 'user@example.com',
    name: 'John Doe',
    phone: '+1-234-567-8900',
  },

  /**
   * Updated user profile
   */
  updatedProfile: {
    id: 'user-1',
    email: 'newemail@example.com',
    name: 'Jane Doe',
    phone: '+1-555-123-4567',
  },

  /**
   * JWT token for testing
   */
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ.signature',

  /**
   * Chat session data
   */
  chatSession: {
    sessionId: 'chat-123',
    channel: 'general',
    userId: 'user-1',
    connected: true,
  },

  /**
   * Market data sample
   */
  marketData: {
    assets: [
      { symbol: 'AAPL', price: 150.25, change: 1.5 },
      { symbol: 'GOOGL', price: 2800.75, change: -0.5 },
      { symbol: 'MSFT', price: 300.5, change: 2.1 },
    ],
  },

  /**
   * Chat message
   */
  chatMessage: {
    id: 'msg-1',
    text: 'Hello!',
    userId: 'user-1',
    timestamp: Date.now(),
  },

  /**
   * Error responses
   */
  errors: {
    invalidCredentials: { error: 'Invalid email or password' },
    networkError: { error: 'Network connection failed' },
    timeout: { error: 'Request timeout' },
    notFound: { error: 'Resource not found' },
  },
};

/**
 * Common test scenarios
 */
export const testScenarios = {
  /**
   * Successful login flow
   */
  successfulLogin: async (fsm: StateMachine<any>) => {
    const states: string[] = [];
    fsm.subscribe((state) => states.push(state));

    fsm.send('LOGIN', testData.validUser);
    fsm.send('SUCCESS', { token: testData.token });

    return { states, token: testData.token };
  },

  /**
   * Failed login with retry
   */
  failedLoginWithRetry: async (fsm: StateMachine<any>) => {
    const states: string[] = [];
    fsm.subscribe((state) => states.push(state));

    fsm.send('LOGIN', testData.invalidUser);
    fsm.send('FAILURE', testData.errors.invalidCredentials);
    fsm.send('RETRY');
    fsm.send('LOGIN', testData.validUser);
    fsm.send('SUCCESS', { token: testData.token });

    return states;
  },

  /**
   * Account edit and save
   */
  editAndSaveAccount: async (
    accountFSM: StateMachine<any>,
    newProfile: any = testData.updatedProfile
  ) => {
    const states: string[] = [];
    accountFSM.subscribe((state) => states.push(state));

    accountFSM.send('SUCCESS'); // View state
    accountFSM.send('EDIT');
    accountFSM.send('SAVE', newProfile);
    accountFSM.send('SUCCESS'); // Back to viewing

    return { states, profile: newProfile };
  },

  /**
   * Connect and send chat message
   */
  sendChatMessage: async (
    chatFSM: StateMachine<any>,
    message = testData.chatMessage
  ) => {
    const states: string[] = [];
    chatFSM.subscribe((state) => states.push(state));

    chatFSM.send('CONNECT', testData.chatSession);
    chatFSM.send('SUCCESS');
    chatFSM.send('SEND_MESSAGE', message);

    return { states, message };
  },
};

/**
 * Assertion helpers
 */
export const assertions = {
  /**
   * Assert FSM is in a valid state from its config
   */
  isValidState(fsm: StateMachine<any>, config: any): boolean {
    const currentState = fsm.getState();
    const validStates = Object.keys(config.states || {});
    return validStates.includes(currentState);
  },

  /**
   * Assert event can be sent from current state
   */
  canSendEvent(fsm: StateMachine<any>, event: string, config: any): boolean {
    const currentState = fsm.getState();
    const stateConfig = config.states?.[currentState];

    if (!stateConfig) return false;
    if (typeof stateConfig === 'string') return false; // No transitions in short form

    const transitions = stateConfig.on || {};
    return event in transitions;
  },

  /**
   * Assert context has expected properties
   */
  hasContextProps(
    fsm: StateMachine<any>,
    expectedProps: string[]
  ): boolean {
    const context = fsm.getContext();
    return expectedProps.every((prop) => prop in context);
  },

  /**
   * Assert context property has expected value
   */
  contextHasValue(fsm: StateMachine<any>, prop: string, value: any): boolean {
    const context = fsm.getContext();
    return context[prop] === value;
  },
};

/**
 * Event simulation helpers
 */
export const eventHelpers = {
  /**
   * Simulate form submission
   */
  submitForm(form: HTMLFormElement, event = 'SUBMIT'): Record<string, string> {
    const data = getFormData(form);
    return data;
  },

  /**
   * Simulate button click
   */
  clickButton(button: HTMLButtonElement, event?: string): {
    button: HTMLButtonElement;
    event: string | undefined;
  } {
    return { button, event };
  },

  /**
   * Simulate input change
   */
  changeInput(
    input: HTMLInputElement,
    value: string
  ): {
    element: HTMLInputElement;
    value: string;
  } {
    input.value = value;
    return { element: input, value };
  },
};

export default {
  setupIAMTestEnvironment,
  createTestFSM,
  waitForState,
  collectTransitions,
  createMockService,
  assertTransition,
  createTestForm,
  getFormData,
  isValidEmail,
  testData,
  testScenarios,
  assertions,
  eventHelpers,
};
