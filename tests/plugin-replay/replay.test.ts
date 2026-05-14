import { describe, it, expect } from 'vitest';
import { ReplayPlugin } from '@ux3/plugin-replay';
import { StateMachine } from '../../src/fsm/index.ts';

describe('@ux3/plugin-replay', () => {
  it('installs and captures FSM events', async () => {
    const app: any = {
      config: {
        plugins: {
          '@ux3/plugin-replay': {
            enabled: true,
            store: { backend: 'memory' }
          }
        }
      },
      utils: {},
      registerService: (name: string, factory: any) => {
        app.services = app.services || {};
        app.services[name] = factory();
      },
      registerView: () => {},
      registerRoute: () => {},
      registerMachine: () => {},
    };

    await ReplayPlugin.install(app);
    expect(app.utils.replay).toBeDefined();

    const fsm = new StateMachine(
      {
        id: 'capture-test',
        initial: 'idle',
        context: {},
        states: {
          idle: {
            on: {
              PING: 'idle'
            }
          }
        }
      },
      false
    );
    fsm.start();
    fsm.send('PING');
    await new Promise((resolve) => setTimeout(resolve, 10));

    const events = app.utils.replay.getBufferedEvents();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].machine).toBe('capture-test');
    expect(events[0].type).toBe('PING');
  });
});
