import type { Plugin } from '../../../../src/plugin/registry.js';
import { Store } from '@ux3/plugin-store';
import { StateMachine, FSMRegistry } from '../../../../src/fsm/index.js';
import { ReplayService } from './replay-service.js';
import type { ReplayPluginConfig, ReplayEvent } from './types.js';

const TEMPLATE = `
<ux-panel title="Replay Sessions" subtitle="Inspect, manage, and replay saved event sessions.">
  <div style="display:flex;gap:1rem;flex-wrap:wrap;">
    <ux-button variant="primary" ux-event="click:REFRESH_SESSIONS">Refresh sessions</ux-button>
    <ux-button variant="secondary" ux-event="click:SAVE_SESSION">Save current buffer</ux-button>
    <ux-button variant="secondary" ux-event="click:CLEAR_BUFFER">Clear buffer</ux-button>
  </div>
  <ux-card>
    <h3>Live buffer</h3>
    <p>Events captured from all running FSMs.</p>
    <pre style="white-space: pre-wrap; max-height: 240px; overflow:auto; background:#f8fafc; padding:0.75rem; border-radius:0.5rem;">{{ctx.bufferPreview}}</pre>
  </ux-card>
  <ux-card>
    <h3>Stored sessions</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left;padding:0.5rem;">Name</th>
          <th style="text-align:left;padding:0.5rem;">Created</th>
          <th style="text-align:left;padding:0.5rem;">Events</th>
          <th style="text-align:left;padding:0.5rem;">Actions</th>
        </tr>
      </thead>
      <tbody>
        {{#each ctx.sessions as |session|}}
          <tr>
            <td style="padding:0.5rem;">{{session.name}}</td>
            <td style="padding:0.5rem;">{{session.createdAt}}</td>
            <td style="padding:0.5rem;">{{session.events.length}}</td>
            <td style="padding:0.5rem;">
              <ux-button variant="secondary" ux-event="click:REPLAY_SESSION" ux-event-value="{ \"sessionId\": \"{{session.id}}\" }">Replay</ux-button>
              <ux-button variant="danger" ux-event="click:DELETE_SESSION" ux-event-value="{ \"sessionId\": \"{{session.id}}\" }">Delete</ux-button>
            </td>
          </tr>
        {{else}}
          <tr><td colspan="4" style="padding:0.5rem;">No sessions saved yet.</td></tr>
        {{/each}}
      </tbody>
    </table>
  </ux-card>
</ux-panel>
`;

function normalizeConfig(app: any): ReplayPluginConfig {
  const pluginCfg = (app.config?.plugins && app.config.plugins['@ux3/plugin-replay']) || {};
  return {
    route: '/replay',
    viewName: 'replay',
    modelName: 'replay-session',
    bufferSize: 200,
    ...pluginCfg,
  } as ReplayPluginConfig;
}

function resolveStoreConfig(cfg: ReplayPluginConfig): any {
  return cfg.store || { backend: 'memory' };
}

function extractEventMetadata(event: any, machineId: string): ReplayEvent {
  const normalized = typeof event === 'string' ? { type: event } : event;
  return {
    id: `${machineId}:${normalized.type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    machine: machineId,
    type: normalized.type,
    payload: normalized.payload ? { ...normalized.payload } : undefined,
    timestamp: Date.now(),
    fromDOM: Boolean(normalized.fromDOM),
    replayed: Boolean(normalized.replayed),
  };
}

export const ReplayPlugin: Plugin = {
  name: '@ux3/plugin-replay',
  version: '0.1.0',
  description: 'UX3 replay plugin for event observation, session storage, and replayable FSM sessions.',
  dependencies: ['@ux3/plugin-store'],

  async install(app) {
    const cfg = normalizeConfig(app);
    if (cfg.enabled === false) {
      return;
    }

    const storeConfig = resolveStoreConfig(cfg);
    const store = new Store(storeConfig);
    const replayService = new ReplayService(store, cfg);

    await replayService.connect();

    if (!app.utils) app.utils = {};
    (app.utils as any).replay = replayService;
    app.registerService?.('replay', () => replayService as any);

    if (typeof window !== 'undefined') {
      (window as any).__ux3Replay = replayService;
    }

    const originalSend = StateMachine.prototype.send;
    if (!(StateMachine.prototype as any).__ux3ReplayPatched) {
      (StateMachine.prototype as any).__ux3ReplayPatched = true;
      StateMachine.prototype.send = function (this: any, event: any) {
        const machineId = this.config?.id || 'unknown';
        if (machineId === 'replay-ui') {
          return originalSend.call(this, event);
        }
        const metaEvent = extractEventMetadata(event, machineId);
        void replayService.recordEvent(metaEvent);
        return originalSend.call(this, event);
      };
    }

    const replayMachine = new StateMachine(
      {
        id: 'replay-ui',
        initial: 'idle',
        context: {
          sessions: [],
          bufferPreview: 'No events captured yet.',
        },
        states: {
          idle: {
            entry: [async (context) => {
              const sessions = await replayService.listSessions();
              return {
                sessions,
                bufferPreview: JSON.stringify(replayService.getBufferedEvents(), null, 2),
              };
            }],
            on: {
              REFRESH_SESSIONS: {
                target: 'idle',
                actions: [async (context) => {
                  const sessions = await replayService.listSessions();
                  return {
                    sessions,
                    bufferPreview: JSON.stringify(replayService.getBufferedEvents(), null, 2),
                  };
                }],
              },
              SAVE_SESSION: {
                target: 'idle',
                actions: [async (context) => {
                  await replayService.saveSession(`session-${new Date().toISOString()}`);
                  const sessions = await replayService.listSessions();
                  return {
                    sessions,
                    bufferPreview: JSON.stringify(replayService.getBufferedEvents(), null, 2),
                  };
                }],
              },
              CLEAR_BUFFER: {
                target: 'idle',
                actions: [async (context) => {
                  replayService.clearBuffer();
                  const sessions = await replayService.listSessions();
                  return {
                    sessions,
                    bufferPreview: JSON.stringify(replayService.getBufferedEvents(), null, 2),
                  };
                }],
              },
              REPLAY_SESSION: {
                target: 'idle',
                actions: [async (context, event) => {
                  const sessionId = (event.payload && (event.payload.sessionId || event.payload['data-session-id'])) || undefined;
                  if (sessionId) {
                    await replayService.replaySession(sessionId);
                  }
                  const sessions = await replayService.listSessions();
                  return {
                    sessions,
                    bufferPreview: JSON.stringify(replayService.getBufferedEvents(), null, 2),
                  };
                }],
              },
              DELETE_SESSION: {
                target: 'idle',
                actions: [async (context, event) => {
                  const sessionId = (event.payload && (event.payload.sessionId || event.payload['data-session-id'])) || undefined;
                  if (sessionId) {
                    await replayService.deleteSession(sessionId);
                  }
                  const sessions = await replayService.listSessions();
                  return {
                    sessions,
                    bufferPreview: JSON.stringify(replayService.getBufferedEvents(), null, 2),
                  };
                }],
              },
            },
          },
        },
      },
      false
    );

    replayMachine.start();
    app.registerMachine?.('replay-ui', replayMachine as any);
    app.registerView?.(cfg.viewName || 'replay', TEMPLATE);
    app.registerRoute?.(cfg.route || '/replay', cfg.viewName || 'replay', 'Replay');
  },
};

export default ReplayPlugin;
