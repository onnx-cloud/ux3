import { describe, it, beforeEach } from 'vitest';
import { FSMRegistry } from '../..//src/fsm/registry';
import { StateMachine } from '../../src/fsm/state-machine';
import { config } from '../../examples/iam/generated/config';
import { runScenario } from '../../src/test-tools/decl-runner';

// register all machines before each scenario
beforeEach(() => {
  console.log('config keys', Object.keys(config));
  console.log('machines keys', config.machines && Object.keys(config.machines));
  FSMRegistry.clear();
  FSMRegistry.register('login', new StateMachine(config.machines.login));
  FSMRegistry.register('news', new StateMachine(config.machines.news));
  FSMRegistry.register('account', new StateMachine(config.machines.account));
  FSMRegistry.register('chat', new StateMachine(config.machines.chat));
  FSMRegistry.register('dashboard', new StateMachine(config.machines.dashboard));
  FSMRegistry.register('market', new StateMachine(config.machines.market));
});

describe('IAM declarative scenarios', () => {
  it('login success scenario', async () => {
    await runScenario('tests/decl/iam/login-success.yaml', { runner: 'unit' });
  });

  it('login failure & retry scenario', async () => {
    await runScenario('tests/decl/iam/login-failure.yaml', { runner: 'unit' });
  });

  it('news load scenario', async () => {
    await runScenario('tests/decl/iam/news-load.yaml', { runner: 'unit' });
  });

  it('market load scenario', async () => {
    await runScenario('tests/decl/iam/market-load.yaml', { runner: 'unit' });
  });
});
