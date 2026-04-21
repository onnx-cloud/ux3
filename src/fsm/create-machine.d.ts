/**
 * Factory function for creating state machines
 */
import { StateMachine } from './state-machine.js';
import type { MachineConfig } from './types.js';
/**
 * Create a state machine from configuration
 */
export declare function createMachine<T extends Record<string, any>>(config: MachineConfig<T>): StateMachine<T>;
