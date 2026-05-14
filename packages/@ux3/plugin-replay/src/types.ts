import type { StoreConfig } from '@ux3/plugin-store';

export interface ReplayEvent {
  id: string;
  machine: string;
  type: string;
  payload?: Record<string, unknown>;
  timestamp: number;
  fromDOM?: boolean;
  replayed?: boolean;
  meta?: Record<string, unknown>;
}

export interface ReplaySession {
  id: string;
  name: string;
  createdAt: number;
  events: ReplayEvent[];
}

export interface ReplayPluginConfig {
  enabled?: boolean;
  route?: string;
  viewName?: string;
  store?: StoreConfig;
  modelName?: string;
  bufferSize?: number;
  rootDir?: string;
}
