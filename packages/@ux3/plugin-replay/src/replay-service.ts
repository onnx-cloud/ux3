import { Store } from '@ux3/plugin-store';
import { FSMRegistry } from '../../../../src/fsm/index.js';
import type { ReplayEvent, ReplaySession, ReplayPluginConfig } from './types.js';

const DEFAULT_MODEL = 'replay-session';
const DEFAULT_BUFFER = 200;

export class ReplayService {
  private store: Store;
  private modelName: string;
  private buffer: ReplayEvent[] = [];
  private bufferSize: number;
  private config: ReplayPluginConfig;

  constructor(store: Store, config: ReplayPluginConfig) {
    this.store = store;
    this.config = config;
    this.modelName = config.modelName || DEFAULT_MODEL;
    this.bufferSize = config.bufferSize || DEFAULT_BUFFER;
  }

  async connect(): Promise<void> {
    await this.store.connect();
  }

  getBufferedEvents(): ReplayEvent[] {
    return [...this.buffer];
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  async recordEvent(event: ReplayEvent): Promise<void> {
    if (event.replayed) return;
    const payloadCopy = event.payload ? { ...event.payload } : undefined;
    const nextEvent: ReplayEvent = {
      ...event,
      payload: payloadCopy,
      id: `${event.machine}:${event.type}:${event.timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      timestamp: event.timestamp || Date.now(),
      replayed: event.replayed || false,
    };

    this.buffer.push(nextEvent);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
  }

  async saveSession(name: string): Promise<ReplaySession> {
    const session: ReplaySession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name || `session-${new Date().toISOString()}`,
      createdAt: Date.now(),
      events: this.getBufferedEvents(),
    };

    await this.store.upsert(this.modelName, session.id, session);
    return session;
  }

  async listSessions(): Promise<ReplaySession[]> {
    return await this.store.find(this.modelName, {}, [{ field: 'createdAt', dir: 'desc' }]);
  }

  async getSession(id: string): Promise<ReplaySession | undefined> {
    return await this.store.findOne(this.modelName, id);
  }

  async deleteSession(id: string): Promise<void> {
    await this.store.delete(this.modelName, id);
  }

  async replaySession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Replay session not found: ${sessionId}`);
    }

    for (const event of session.events) {
      const machine = FSMRegistry.get(event.machine);
      if (!machine) continue;
      machine.send({
        type: event.type,
        payload: event.payload,
        fromDOM: false,
        replayed: true,
      } as any);
    }
  }
}
