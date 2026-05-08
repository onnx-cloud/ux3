/**
 * Inspector Event Bus
 *
 * Thin proxy over the canonical devtools event stream (window.__ux3DevTools).
 * Falls back to a local buffer when the devtools service is not available.
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

function getService(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).__ux3DevTools ?? null;
}

// Local fallback buffer used when the devtools service is unavailable.
let fallbackBuffer: InspectorEvent[] = [];
let fallbackHandlers: Set<InspectorEventHandler> = new Set();

function emitLocal(source: InspectorEventSource, type: string, payload?: unknown): void {
  const evt: InspectorEvent = { ts: Date.now(), source, type, payload };
  if (fallbackBuffer.length >= MAX_BUFFER) {
    fallbackBuffer.shift();
  }
  fallbackBuffer.push(evt);
  fallbackHandlers.forEach(h => {
    try { h(evt); } catch { /* noop */ }
  });
}

export const inspectorBus = {
  emit(source: InspectorEventSource, type: string, payload?: unknown): void {
    const svc = getService();
    if (svc) {
      svc.emit(source, type, payload);
      return;
    }
    emitLocal(source, type, payload);
  },

  subscribe(handler: InspectorEventHandler): () => void {
    const svc = getService();
    if (svc) {
      let lastSeen: number = svc.getSnapshot?.()?.events?.length ?? 0;
      return svc.subscribe((snapshot: any) => {
        const evts = snapshot.events as InspectorEvent[];
        const next = evts.slice(lastSeen);
        lastSeen = evts.length;
        for (const evt of next) {
          try { handler(evt); } catch { /* noop */ }
        }
      });
    }
    fallbackHandlers.add(handler);
    return () => { fallbackHandlers.delete(handler); };
  },

  getAll(): readonly InspectorEvent[] {
    const svc = getService();
    if (svc) {
      return (svc.getSnapshot?.()?.events ?? []) as readonly InspectorEvent[];
    }
    return fallbackBuffer;
  },

  clear(): void {
    const svc = getService();
    if (svc) return;
    fallbackBuffer = [];
  },
};
