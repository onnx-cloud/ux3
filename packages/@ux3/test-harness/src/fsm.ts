/**
 * FSM Testing Utilities
 * Factories and helpers for creating and testing StateMachines
 */

import { StateMachine } from '@ux3/ux3/fsm';
import type { FSMConfig, InvokeConfig } from '@ux3/ux3/fsm';

/**
 * Test FSM configuration builder
 * Fluent API for creating FSMs for testing
 */
export class TestFSMBuilder {
  private config: FSMConfig = {
    initial: 'idle',
    states: {},
  };

  private servicesMock: Record<string, any> = {};

  /**
   * Set initial state
   */
  withInitial(state: string): this {
    this.config.initial = state;
    return this;
  }

  /**
   * Add a simple state
   */
  addState(name: string, config?: any): this {
    this.config.states![name] = config || {};
    return this;
  }

  /**
   * Add a state with transitions
   */
  addStateWithTransitions(
    name: string,
    transitions: Record<string, string>
  ): this {
    this.config.states![name] = { on: transitions };
    return this;
  }

  /**
   * Add a state with an invoke configuration
   */
  addStateWithInvoke(
    name: string,
    invoke: InvokeConfig,
    nextState?: string
  ): this {
    this.config.states![name] = {
      invoke,
      on: { SUCCESS: nextState || 'done', ERROR: 'error' },
    };
    return this;
  }

  /**
   * Mock a service method
   */
  mockService(
    serviceName: string,
    methodName: string,
    implementation: Function
  ): this {
    if (!this.servicesMock[serviceName]) {
      this.servicesMock[serviceName] = {};
    }
    this.servicesMock[serviceName][methodName] = implementation;
    return this;
  }

  /**
   * Build the FSM
   */
  build(): StateMachine {
    return new StateMachine(this.config, {
      services: this.servicesMock,
    });
  }
}

/**
 * Create a test FSM with common states
 */
export const createSimpleTestFSM = (): StateMachine => {
  return new TestFSMBuilder()
    .withInitial('idle')
    .addStateWithTransitions('idle', { START: 'loading' })
    .addStateWithTransitions('loading', { DONE: 'success', FAIL: 'error' })
    .addStateWithTransitions('success', { RESET: 'idle' })
    .addStateWithTransitions('error', { RESET: 'idle' })
    .build();
};

/**
 * Assert FSM is in expected state
 */
export const assertFSMState = (
  fsm: StateMachine,
  expectedState: string,
  message?: string
): void => {
  const actual = fsm.getState();
  if (actual !== expectedState) {
    throw new Error(
      message ||
        `Expected FSM state '${expectedState}', got '${actual}'`
    );
  }
};

/**
 * Assert FSM can transition with given event
 */
export const assertFSMCanTransition = (
  fsm: StateMachine,
  action: string,
  expectedState: string
): void => {
  const before = fsm.getState();
  fsm.send(action);
  const after = fsm.getState();

  if (after !== expectedState) {
    throw new Error(
      `FSM transition failed: ${before} --[${action}]--> expected ${expectedState}, got ${after}`
    );
  }
};

/**
 * Track FSM state changes for testing
 */
export class FSMStateTracker {
  private stateHistory: Array<{ state: string; timestamp: number }> = [];
  private unsubscribe: (() => void) | null = null;

  track(fsm: StateMachine): this {
    this.stateHistory = [{ state: fsm.getState(), timestamp: Date.now() }];

    this.unsubscribe = fsm.subscribe((state) => {
      this.stateHistory.push({ state, timestamp: Date.now() });
    });

    return this;
  }

  untrack(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Get state change history
   */
  getHistory(): string[] {
    return this.stateHistory.map((s) => s.state);
  }

  /**
   * Assert specific state sequence occurred
   */
  assertSequence(expected: string[]): void {
    const actual = this.getHistory();
    const match = JSON.stringify(actual) === JSON.stringify(expected);

    if (!match) {
      throw new Error(
        `State sequence mismatch.\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
      );
    }
  }

  /**
   * Get duration of state
   */
  getStateDuration(state: string, index: number = 0): number {
    const entries = this.stateHistory.filter((s) => s.state === state);
    if (entries.length === 0) return -1;
    if (index >= entries.length - 1) return -1;

    const current = entries[index];
    const next = entries[index + 1];
    return next.timestamp - current.timestamp;
  }
}

/**
 * Track FSM events and transitions
 */
export class FSMEventTracker {
  private events: Array<{ action: string; payload?: any; timestamp: number }> =
    [];

  private originalSend: any;

  track(fsm: StateMachine): this {
    // Override send to track events
    this.originalSend = fsm.send.bind(fsm);
    (fsm as any).send = (action: string | any, payload?: any) => {
      const actionType =
        typeof action === 'string' ? action : (action as any).type;
      this.events.push({
        action: actionType,
        payload: payload || (typeof action === 'object' ? action.payload : undefined),
        timestamp: Date.now(),
      });
      return this.originalSend(action, payload);
    };

    return this;
  }

  /**
   * Get all tracked events
   */
  getEvents(): typeof this.events {
    return this.events;
  }

  /**
   * Assert event was sent with payload
   */
  assertEventSent(action: string, payload?: any): void {
    const found = this.events.find(
      (e) =>
        e.action === action &&
        (!payload || JSON.stringify(e.payload) === JSON.stringify(payload))
    );

    if (!found) {
      throw new Error(
        `Event '${action}' not found in event history: ${JSON.stringify(this.events.map((e) => e.action))}`
      );
    }
  }

  /**
   * Assert event sequence
   */
  assertSequence(actions: string[]): void {
    const actual = this.events.map((e) => e.action);
    const match = JSON.stringify(actual) === JSON.stringify(actions);

    if (!match) {
      throw new Error(
        `Event sequence mismatch.\nExpected: ${JSON.stringify(actions)}\nActual: ${JSON.stringify(actual)}`
      );
    }
  }

  /**
   * Clear event history
   */
  reset(): void {
    this.events = [];
  }
}

/**
 * Comprehensive FSM test fixture
 */
export class FSMTestFixture {
  fsm: StateMachine;
  stateTracker: FSMStateTracker;
  eventTracker: FSMEventTracker;

  constructor(fsm: StateMachine) {
    this.fsm = fsm;
    this.stateTracker = new FSMStateTracker().track(fsm);
    this.eventTracker = new FSMEventTracker().track(fsm);
  }

  /**
   * Send event and assert resulting state
   */
  async transitionTo(
    action: string,
    expectedState: string,
    delayMs: number = 0
  ): Promise<void> {
    this.fsm.send(action);

    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    assertFSMState(this.fsm, expectedState);
  }

  /**
   * Get current state
   */
  getState(): string {
    return this.fsm.getState();
  }

  /**
   * Get context
   */
  getContext(): any {
    return this.fsm.getContext();
  }

  /**
   * Set context
   */
  setContext(context: any): void {
    this.fsm.setState(context);
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    // Reset would depend on FSM API for getting initial state
    this.stateTracker.untrack();
    this.eventTracker.reset();
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stateTracker.untrack();
  }
}
