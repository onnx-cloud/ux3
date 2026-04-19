/**
 * StateMachine error handling tests
 */

import { describe, it, expect } from 'vitest';
import { StateMachine } from '../../src/fsm/state-machine.ts';
import type { MachineConfig } from '../../src/fsm/types.ts';

describe('StateMachine error handling', () => {
  it('should throw when a transition target is missing', () => {
    const config: MachineConfig<any> = {
      initial: 'idle',
      context: {},
      states: {
        idle: {
          on: {
            GO: 'missing'
          }
        }
      }
    };

    const fsm = new StateMachine(config);
    expect(() => fsm.send('GO')).toThrow(/target state "missing" not found/);
  });

  it('should invoke errorActions and transition to errorTarget when state invoke fails', async () => {
    const config: MachineConfig<any> = {
      initial: 'idle',
      context: { counter: 0 },
      states: {
        idle: {
          on: {
            START: 'fetch'
          }
        },
        fetch: {
          invoke: {
            src: 'fetchData'
          },
          errorTarget: 'failed',
          errorActions: [
            (ctx) => {
              ctx.counter = (ctx.counter ?? 0) + 1;
            }
          ]
        },
        failed: {}
      }
    };

    const fsm = new StateMachine(config);
    fsm.registerInvokeHandler('fetchData', async () => {
      throw new Error('service failure');
    });

    fsm.send('START');
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(fsm.getState()).toBe('failed');
    expect(fsm.getContext().counter).toBe(1);
  });
});
