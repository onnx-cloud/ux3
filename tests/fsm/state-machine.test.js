import { describe, it, expect, vi } from 'vitest';
import { StateMachine } from '../../src/fsm/state-machine';
import { FSMRegistry } from '../../src/fsm/registry';
describe('StateMachine', () => {
    it('should initialize with initial state and context', () => {
        const config = {
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
        const config = {
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
        const config = {
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
        const config = {
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
    it('should merge partial context updates returned from actions', () => {
        const config = {
            id: 'update-test',
            initial: 'idle',
            context: { foo: 1 },
            states: {
                idle: {
                    on: {
                        UPDATE: {
                            target: 'idle',
                            actions: [
                                (ctx) => {
                                    return { foo: ctx.foo + 1 };
                                },
                                (ctx) => ({ bar: 'hello' })
                            ]
                        }
                    }
                }
            }
        };
        const fsm = new StateMachine(config);
        fsm.send('UPDATE');
        expect(fsm.getContext()).toEqual({ foo: 2, bar: 'hello' });
    });
    it('should handle complex state config (nested/parallel not supported yet by current impl but checking basic structure)', () => {
        // Current implementation seems to be a flat FSM based on the code read.
        const config = {
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
    it('global subscribers receive broadcast events', () => {
        const events = [];
        const unsub = FSMRegistry.subscribeGlobal((e) => events.push(e));
        FSMRegistry.broadcastGlobal('TEST');
        expect(events.length).toBe(1);
        expect(events[0].type).toBe('TEST');
        unsub();
        FSMRegistry.broadcastGlobal('ANOTHER');
        expect(events.length).toBe(1); // no new event
    });
    it('FSMRegistry.broadcastGlobal should deliver events to all machines', () => {
        const config1 = {
            id: 'g1',
            initial: 'idle',
            states: { idle: { on: { GLOBAL: 'done' } }, done: {} }
        };
        const config2 = {
            id: 'g2',
            initial: 'idle',
            states: { idle: { on: { GLOBAL: 'done' } }, done: {} }
        };
        const fsm1 = new StateMachine(config1);
        const fsm2 = new StateMachine(config2);
        FSMRegistry.clear();
        FSMRegistry.register('one', fsm1);
        FSMRegistry.register('two', fsm2);
        FSMRegistry.broadcastGlobal({ type: 'GLOBAL' });
        expect(fsm1.getState()).toBe('done');
        expect(fsm2.getState()).toBe('done');
    });
});
//# sourceMappingURL=state-machine.test.js.map