/**
 * Factory function for creating state machines
 */

import { StateMachine } from './state-machine.js';
import type { StateConfig } from './types.js';

/**
 * Create a state machine from configuration
 */
export function createMachine<T extends Record<string, any>>(
  config: StateConfig<T>
): StateMachine<T> {
  return new StateMachine(config);
}
