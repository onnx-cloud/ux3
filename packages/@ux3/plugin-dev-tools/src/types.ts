export type DevToolsSource =
  | 'fsm'
  | 'service'
  | 'navigation'
  | 'plugin'
  | 'logger'
  | 'validation'
  | 'hot-reload'
  | 'system';

export interface DevToolsEvent {
  ts: number;
  source: DevToolsSource;
  type: string;
  payload?: unknown;
}

export interface DevToolsPluginSummary {
  name: string;
  version?: string;
  hooks?: string[];
  status?: string;
}

export interface DevToolsSnapshot {
  open: boolean;
  activePanel: string;
  events: readonly DevToolsEvent[];
  plugins: readonly DevToolsPluginSummary[];
}

export interface DevToolsApi {
  getSnapshot(): DevToolsSnapshot;
  subscribe(handler: (snapshot: DevToolsSnapshot) => void): () => void;
  emit(source: DevToolsSource, type: string, payload?: unknown): void;
  recordPlugin(plugin: DevToolsPluginSummary): void;
  open(panel?: string): void;
  close(): void;
}

export interface DevToolsPluginConfig {
  enabled?: boolean;
  inspector?: boolean;
  devTools?: boolean;
  exposeGlobal?: boolean;
  maxEvents?: number;
}
