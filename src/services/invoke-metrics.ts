export interface InvokeMetricsSnapshot {
  entries: Record<string, { count: number; totalTime: number; avgTime: number; errors: number; errorRate: number }>;
  totalCalls: number;
  totalErrors: number;
  overallErrorRate: number;
}

export class InvokeMetrics {
  private _stats = new Map<string, { count: number; totalTime: number; errors: number }>();
  private flushHandlers: Array<(snapshot: InvokeMetricsSnapshot) => void> = [];

  record(service: string, method: string, duration: number, success: boolean): void {
    const key = `${service}.${method}`;
    const entry = this._stats.get(key) || { count: 0, totalTime: 0, errors: 0 };
    entry.count++;
    entry.totalTime += duration;
    if (!success) entry.errors++;
    this._stats.set(key, entry);
  }

  recordInvoke(service: string, method: string, duration: number, error?: Error): void {
    this.record(service, method, duration, !error);
  }

  getSnapshot(service?: string, method?: string): InvokeMetricsSnapshot {
    let entries = Array.from(this._stats.entries());
    if (service) {
      const prefix = method ? `${service}.${method}` : `${service}.`;
      entries = entries.filter(([k]) => method ? k === prefix : k.startsWith(prefix));
    }

    const snapshot: Record<string, InvokeMetricsSnapshot['entries'][string]> = {};
    let totalCalls = 0;
    let totalErrors = 0;

    for (const [key, s] of entries) {
      snapshot[key] = {
        count: s.count,
        totalTime: s.totalTime,
        avgTime: s.count > 0 ? s.totalTime / s.count : 0,
        errors: s.errors,
        errorRate: s.count > 0 ? s.errors / s.count : 0,
      };
      totalCalls += s.count;
      totalErrors += s.errors;
    }

    return {
      entries: snapshot,
      totalCalls,
      totalErrors,
      overallErrorRate: totalCalls > 0 ? totalErrors / totalCalls : 0,
    };
  }

  stats(service?: string, method?: string): InvokeMetricsSnapshot {
    return this.getSnapshot(service, method);
  }

  onFlush(handler: (snapshot: InvokeMetricsSnapshot) => void): () => void {
    this.flushHandlers.push(handler);
    return () => {
      const idx = this.flushHandlers.indexOf(handler);
      if (idx >= 0) this.flushHandlers.splice(idx, 1);
    };
  }

  flush(): InvokeMetricsSnapshot {
    const snapshot = this.getSnapshot();
    for (const handler of this.flushHandlers) {
      try { handler(snapshot); } catch { /* noop */ }
    }
    return snapshot;
  }

  clear(): void {
    this._stats.clear();
  }

  clearFor(service: string, method?: string): void {
    if (method) {
      this._stats.delete(`${service}.${method}`);
    } else {
      for (const key of this._stats.keys()) {
        if (key.startsWith(`${service}.`)) this._stats.delete(key);
      }
    }
  }
}
