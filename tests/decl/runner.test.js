import { describe, it, beforeEach } from 'vitest';
import { FSMRegistry } from '../../src/fsm/registry';
import { StateMachine } from '../../src/fsm/state-machine';
import { runScenario } from '../../src/test-tools/decl-runner';
// helper to create a minimal machine
function makeTestFsm() {
    return new StateMachine({
        initial: 'idle',
        context: { count: 0 },
        states: {
            idle: {
                on: {
                    START: 'running',
                    INCR: {
                        target: 'idle',
                        actions: [ctx => ({ ...ctx, count: ctx.count + 1 })]
                    }
                }
            },
            running: { on: { STOP: 'idle' } }
        }
    });
}
describe('declarative scenario runner', () => {
    beforeEach(() => {
        FSMRegistry.clear();
    });
    it('executes simple YAML scenario and verifies FSM state', async () => {
        const fsm = makeTestFsm();
        FSMRegistry.register('test', fsm);
        await runScenario('tests/decl/simple.yaml', { runner: 'unit' });
    });
    it('runs a more complex flow with assertions and wait', async () => {
        const fsm = makeTestFsm();
        FSMRegistry.register('test', fsm);
        await runScenario('tests/decl/full.yaml', { runner: 'unit' });
    });
});
//# sourceMappingURL=runner.test.js.map