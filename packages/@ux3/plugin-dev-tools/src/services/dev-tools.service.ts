import type {
  DevToolsApi,
  DevToolsEvent,
  DevToolsPluginSummary,
  DevToolsSnapshot,
  DevToolsSource,
} from '../types.js';

export interface CreateDevToolsServiceOptions {
  maxEvents?: number;
  activePanel?: string;
}

export function createDevToolsService(options: CreateDevToolsServiceOptions = {}): DevToolsApi {
  const handlers = new Set<(snapshot: DevToolsSnapshot) => void>();
  const maxEvents = Number.isFinite(options.maxEvents) && (options.maxEvents as number) > 0
    ? Math.floor(options.maxEvents as number)
    : 500;

  let open = false;
  let activePanel = options.activePanel || 'fsm';
  const events: DevToolsEvent[] = [];
  const plugins: DevToolsPluginSummary[] = [];

  const snapshot = (): DevToolsSnapshot => ({
    open,
    activePanel,
    events,
    plugins,
  });

  const notify = (): void => {
    const snap = snapshot();
    for (const handler of handlers) {
      try {
        handler(snap);
      } catch {
        // Swallow handler errors so one bad listener does not break tooling updates.
      }
    }
  };

  const api: DevToolsApi = {
    getSnapshot(): DevToolsSnapshot {
      return snapshot();
    },

    subscribe(handler: (snapshot: DevToolsSnapshot) => void): () => void {
      handlers.add(handler);
      handler(snapshot());
      return () => {
        handlers.delete(handler);
      };
    },

    emit(source: DevToolsSource, type: string, payload?: unknown): void {
      events.push({ ts: Date.now(), source, type, payload });
      if (events.length > maxEvents) {
        events.splice(0, events.length - maxEvents);
      }
      notify();
    },

    recordPlugin(plugin: DevToolsPluginSummary): void {
      const existing = plugins.findIndex((entry) => entry.name === plugin.name);
      if (existing >= 0) {
        plugins.splice(existing, 1, plugin);
      } else {
        plugins.push(plugin);
      }
      notify();
    },

    open(panel?: string): void {
      open = true;
      if (panel && panel.trim()) {
        activePanel = panel;
      }
      notify();
    },

    close(): void {
      open = false;
      notify();
    },
  };

  return api;
}
