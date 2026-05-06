/**
 * Inspector Event Bus
 * Lightweight pub/sub used by all inspector panels to push entries to the Events timeline.
 * Isolated from the app's event system.
 */

type DevToolsBridgeEvent = {
  ts: number;
  source: string;
  type: string;
  payload?: unknown;
};

type DevToolsBridgeSnapshot = {
  events: readonly DevToolsBridgeEvent[];
};

type DevToolsBridgeApi = {
  getSnapshot(): DevToolsBridgeSnapshot;
  subscribe(handler: (snapshot: DevToolsBridgeSnapshot) => void): () => void;
  emit(source: string, type: string, payload?: unknown): void;
};

declare global {
  interface Window {
    __ux3DevTools?: DevToolsBridgeApi;
  }
}

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

  private getService(): DevToolsBridgeApi | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.__ux3DevTools ?? null;
  }

  emit(source: InspectorEventSource, type: string, payload?: unknown): void {
    const service = this.getService();
    if (service) {
      service.emit(source, type, payload);
      return;
    }

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
    const service = this.getService();
    if (service) {
      let lastSeen = service.getSnapshot().events.length;
      return service.subscribe((snapshot) => {
        const nextEvents = snapshot.events.slice(lastSeen) as InspectorEvent[];
        lastSeen = snapshot.events.length;
        nextEvents.forEach((event) => {
          try {
            handler(event);
          } catch {
            // noop
          }
        });
      });
    }

    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  getAll(): readonly InspectorEvent[] {
    const service = this.getService();
    if (service) {
      return service.getSnapshot().events as readonly InspectorEvent[];
    }
    return this.buffer;
  }

  clear(): void {
    if (this.getService()) {
      return;
    }
    this.buffer = [];
  }
}

export const inspectorBus = new InspectorEventBus();
