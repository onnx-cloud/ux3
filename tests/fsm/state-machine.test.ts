import { describe, it, expect, vi } from 'vitest';
import { StateMachine } from '../state-machine.js';
import type { StateConfig } from '../types.js';

describe('StateMachine', () => {
  it('should initialize with initial state and context', () => {
    const config: StateConfig<any> = {
      id: 'test',
      initial: 'idle',
      context: { count: 0 },
      states: {
        idle: {
          on: { START: 'running' }
        },
        running: {}
      }
    };

    const fsm = new StateMachine(config);
    expect(fsm.getState()).toBe('idle');
    expect(fsm.getContext()).toEqual({ count: 0 });
  });

  it('should transition to a new state on event', () => {
    const config: StateConfig<any> = {
      id: 'test',
      initial: 'idle',
      states: {
        idle: {
          on: { START: 'running' }
        },
        running: {
          on: { STOP: 'idle' }
        }
      }
    };

    const fsm = new StateMachine(config);
    fsm.send('START');
    expect(fsm.getState()).toBe('running');
    fsm.send('STOP');
    expect(fsm.getState()).toBe('idle');
  });

  it('should respect guards during transition', () => {
    const config: StateConfig<{ count: number }> = {
      id: 'test',
      initial: 'idle',
      context: { count: 0 },
      states: {
        idle: {
          on: {
            INCREMENT: {
              target: 'idle',
              actions: [(ctx) => { ctx.count++; }]
            },
            START: {
              target: 'running',
              guard: (ctx) => ctx.count >= 2
            }
          }
        },
        running: {}
      }
    };

    const fsm = new StateMachine(config);
    
    // Attempt START when count is 0
    fsm.send('START');
    expect(fsm.getState()).toBe('idle');

    // Increment count twice
    fsm.send('INCREMENT');
    fsm.send('INCREMENT');
    expect(fsm.getContext().count).toBe(2);

    // Attempt START when count is 2
    fsm.send('START');
    expect(fsm.getState()).toBe('running');
  });

  it('should execute actions on transition', () => {
    const action = vi.fn();
    const config: StateConfig<any> = {
      id: 'test',
      initial: 'idle',
      states: {
        idle: {
          on: {
            GO: {
              target: 'active',
              actions: [action]
            }
          }
        },
        active: {}
      }
    };

    const fsm = new StateMachine(config);
    fsm.send({ type: 'GO', data: 'some-payload' });

    expect(action).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: 'GO', data: 'some-payload' }));
  });

  it('should handle complex state config (nested/parallel not supported yet by current impl but checking basic structure)', () => {
    // Current implementation seems to be a flat FSM based on the code read.
    const config: StateConfig<any> = {
      id: 'test',
      initial: 'a',
      states: {
        a: { on: { NEXT: 'b' } },
        b: { on: { NEXT: 'c' } },
        c: { on: { RESET: 'a' } }
      }
    };
    const fsm = new StateMachine(config);
    fsm.send('NEXT');
    expect(fsm.getState()).toBe('b');
    fsm.send('NEXT');
    expect(fsm.getState()).toBe('c');
    fsm.send('RESET');
    expect(fsm.getState()).toBe('a');
  });
});
