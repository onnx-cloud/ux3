import { describe, expect, it } from 'vitest';
import { createMachine } from '@ux3/fsm';

describe('fsm-driven-reactive-ui paper evidence', () => {
  it('creates a simple FSM and transitions between states', () => {
    const machine = createMachine({
      id: 'paper-fsm',
      initial: 'idle',
      states: {
        idle: {
          on: { START: 'running' },
        },
        running: {
          on: { STOP: 'idle' },
        },
      },
    });

    expect(machine.getState()).toBe('idle');
    machine.send('START');
    expect(machine.getState()).toBe('running');
    machine.send('STOP');
    expect(machine.getState()).toBe('idle');
  });
});
