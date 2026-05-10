/**
 * Tests for WIRING Phase 1-3 features:
 * - Auto-payload merge (fromDOM)
 * - Event name inference
 * - sendTo cross-FSM communication
 * - validate: true HTML5 constraint validation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { StateMachine } from '../../src/fsm/state-machine';

describe('WIRING: Auto-payload merge', () => {
  it('merges event payload into context for DOM-sourced events (fromDOM)', () => {
    const config: any = {
      id: 'test',
      initial: 'idle',
      context: { count: 0 },
      states: {
        idle: { on: { INCREMENT: { target: 'idle', actions: [(ctx: any) => { ctx.count++; }] } } },
      },
    };
    const fsm = new StateMachine(config);

    fsm.send({ type: 'INCREMENT', payload: { amount: 5 }, fromDOM: true });
    expect((fsm.getContext() as any).amount).toBe(5);
    expect((fsm.getContext() as any).count).toBe(1);
  });

  it('does NOT merge payload for programmatic events (no fromDOM)', () => {
    const config: any = {
      id: 'test',
      initial: 'idle',
      context: { count: 0 },
      states: {
        idle: { on: { FIRE: { target: 'idle' } } },
      },
    };
    const fsm = new StateMachine(config);

    fsm.send({ type: 'FIRE', payload: { extra: 'should-not-appear' } });
    expect((fsm.getContext() as any).extra).toBeUndefined();
  });

  it('respects payload: false opt-out even for DOM events', () => {
    const config: any = {
      id: 'test',
      initial: 'idle',
      context: { count: 0 },
      states: {
        idle: { on: { CLICK: { target: 'idle', payload: false } } },
      },
    };
    const fsm = new StateMachine(config);

    fsm.send({ type: 'CLICK', payload: { extra: 'blocked' }, fromDOM: true });
    expect((fsm.getContext() as any).extra).toBeUndefined();
  });
});

describe('WIRING: sendTo cross-FSM communication', () => {
  it('sends event to target FSM with current context as payload', () => {
    const targetFsm = new StateMachine({
      id: 'target',
      initial: 'idle',
      context: { received: null as any },
      states: {
        idle: { on: { INCOMING: { target: 'idle' } } },
      },
    });

    const sourceFsm = new StateMachine({
      id: 'source',
      initial: 'idle',
      context: { message: 'hello' },
      states: {
        idle: { on: { NOTIFY: { target: 'idle', sendTo: 'target:INCOMING' } } },
      },
    });

    const lookup = (name: string) => name === 'target' ? targetFsm : null;
    sourceFsm.setFSMLookup(lookup);
    targetFsm.setFSMLookup(() => null);

    sourceFsm.send('NOTIFY');
    const ctx = targetFsm.getContext() as any;
    expect(ctx.message).toBe('hello');
  });
});

describe('WIRING: validate: true HTML5 constraint', () => {
  it('blocks transition when form is invalid', () => {
    const fsm = new StateMachine({
      id: 'test',
      initial: 'idle',
      context: {},
      states: {
        idle: { on: { SUBMIT: { target: 'submitted', validate: true } } },
        submitted: {},
      },
    });

    const form = document.createElement('form');
    const input = document.createElement('input');
    input.required = true;
    form.appendChild(input);
    document.body.appendChild(form);

    (form as any).reportValidity = () => false;

    fsm.send({ type: 'SUBMIT', fromDOM: true, sourceElement: form });
    expect(fsm.getState()).toBe('idle'); // blocked

    document.body.removeChild(form);
  });

  it('allows transition when form is valid', () => {
    const fsm = new StateMachine({
      id: 'test',
      initial: 'idle',
      context: {},
      states: {
        idle: { on: { SUBMIT: { target: 'submitted', validate: true } } },
        submitted: {},
      },
    });

    const form = document.createElement('form');
    (form as any).reportValidity = () => true;

    fsm.send({ type: 'SUBMIT', fromDOM: true, sourceElement: form });
    expect(fsm.getState()).toBe('submitted');
  });
});

describe('WIRING: Event name inference', () => {
  it('accepts events sent from inferred action names', () => {
    const fsm = new StateMachine({
      id: 'test',
      initial: 'idle',
      context: {},
      states: {
        idle: {
          on: {
            CHANGE_QUERY: { target: 'idle' },
          },
        },
      },
    });

    fsm.send({ type: 'CHANGE_QUERY', payload: { query: 'test' }, fromDOM: true });
    expect((fsm.getContext() as any).query).toBe('test');
  });
});

describe('WIRING: map on invoke results', () => {
  it('applyResultMap remaps result paths to context keys', async () => {
    const fsm = new StateMachine({
      id: 'test',
      initial: 'idle',
      context: {},
      states: {
        idle: { on: { START: 'loading' } },
        loading: {
          invoke: {
            src: 'testMapper',
            map: { items: 'data.items', total: 'data.meta.count' },
          },
          on: { SUCCESS: 'done' },
        },
        done: {},
      },
    });

    fsm.registerInvokeHandler('testMapper', async () => ({
      data: { items: ['a', 'b'], meta: { count: 2 } },
    }));

    fsm.send('START');

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const ctx = fsm.getContext() as any;
        expect(ctx.items).toEqual(['a', 'b']);
        expect(ctx.total).toBe(2);
        expect(ctx.data).toBeUndefined();
        expect(fsm.getState()).toBe('done');
        resolve();
      }, 100);
    });
  });
});
