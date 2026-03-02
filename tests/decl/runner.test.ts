import { describe, it, expect, beforeEach } from 'vitest';
import { FSMRegistry } from '../../src/fsm/registry';
import { StateMachine } from '../../src/fsm/state-machine';
import { runScenario } from '../../src/test-tools/decl-runner';

// helper to create a minimal machine
function makeTestFsm() {
  return new StateMachine<any>({
    initial: 'idle',
    states: {
      idle: { on: { START: 'running' } },
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
});
