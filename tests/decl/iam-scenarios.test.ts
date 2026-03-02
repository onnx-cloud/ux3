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
  FSMRegistry.register('loginFSM', new StateMachine(config.machines.loginFSM));
  FSMRegistry.register('newsFSM', new StateMachine(config.machines.newsFSM));
  FSMRegistry.register('accountFSM', new StateMachine(config.machines.accountFSM));
  FSMRegistry.register('chatFSM', new StateMachine(config.machines.chatFSM));
  FSMRegistry.register('dashboardFSM', new StateMachine(config.machines.dashboardFSM));
  FSMRegistry.register('marketFSM', new StateMachine(config.machines.marketFSM));
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
