/**
 * @ux3/fsm - Lightweight FSM for view orchestration
 * ~2KB gzipped, zero external dependencies
 */

export { StateMachine } from './state-machine.js';
export type { StateConfig, StateEvent, TransitionConfig, GuardCondition, MachineContext } from './types.js';
export { createMachine } from './create-machine.js';export { FSMRegistry, extractNamespace, extractState } from './registry.js';
export type { FSMRegistryConfig } from './registry.js';