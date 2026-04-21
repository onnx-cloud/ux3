/**
 * Inspector Event Bus
 * Lightweight pub/sub used by all inspector panels to push entries to the Events timeline.
 * Isolated from the app's event system.
 */

export type InspectorEventSource = 'fsm' | 'service' | 'navigation' | 'plugin' | 'logger' | 'validation';

export interface InspectorEvent {
  ts: number;
  source: InspectorEventSource;
  type: string;
  payload?: unknown;
}

export type InspectorEventHandler = (event: InspectorEvent) => void;

const MAX_BUFFER = 500;

class InspectorEventBus {
  private buffer: InspectorEvent[] = [];
  private handlers: Set<InspectorEventHandler> = new Set();

  emit(source: InspectorEventSource, type: string, payload?: unknown): void {
    const evt: InspectorEvent = { ts: Date.now(), source, type, payload };
    if (this.buffer.length >= MAX_BUFFER) {
      this.buffer.shift();
    }
    this.buffer.push(evt);
    this.handlers.forEach(h => {
      try { h(evt); } catch { /* noop */ }
    });
  }

  subscribe(handler: InspectorEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  getAll(): readonly InspectorEvent[] {
    return this.buffer;
  }

  clear(): void {
    this.buffer = [];
  }
}

export const inspectorBus = new InspectorEventBus();
