/**
 * Services Panel — lists registered services with method list and last-call info.
 */

import type { AppContext } from '../../app.js';
import { inspectorBus } from '../event-bus.js';

interface CallRecord {
  ts: number;
  payload: unknown;
  error: string | null;
}

const callLog = new Map<string, CallRecord>();

// Hook into inspect bus for service events
inspectorBus.subscribe(ev => {
  if (ev.source === 'service') {
    const key = `${(ev.payload as any)?.service}.${(ev.payload as any)?.method}`;
    callLog.set(key, { ts: ev.ts, payload: (ev.payload as any)?.payload, error: (ev.payload as any)?.error ?? null });
  }
});

export function createServicesPanel(ctx: AppContext): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'padding:8px;overflow:auto;height:100%;box-sizing:border-box;font-size:11px;';

  const services = ctx.services;
  const names = Object.keys(services);

  if (names.length === 0) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = 'No services registered.';
    root.appendChild(empty);
    return root;
  }

  for (const name of names) {
    const svc = services[name] as Record<string, unknown>;

    const section = document.createElement('details');
    section.style.cssText = 'margin-bottom:8px;border:1px solid var(--ins-border);border-radius:4px;';

    const summary = document.createElement('summary');
    summary.style.cssText =
      'padding:6px 8px;cursor:pointer;background:var(--ins-accent);font-weight:bold;font-size:12px;';
    summary.textContent = name;
    section.appendChild(summary);

    const body = document.createElement('div');
    body.style.padding = '8px';

    const methods = Object.keys(svc).filter(k => typeof svc[k] === 'function');
    if (methods.length === 0) {
      const noM = document.createElement('div');
      noM.style.color = '#888';
      noM.textContent = 'No methods.';
      body.appendChild(noM);
    }

    for (const method of methods) {
      const mRow = document.createElement('div');
      mRow.style.cssText = 'margin-bottom:4px;';

      const mHeader = document.createElement('div');
      mHeader.style.cssText = 'color:#9cdcfe;display:flex;gap:6px;align-items:center;';
      const mName = document.createElement('span');
      mName.textContent = method + '()';
      mHeader.appendChild(mName);

      const key = `${name}.${method}`;
      const rec = callLog.get(key);
      if (rec) {
        const ts = document.createElement('span');
        ts.style.cssText = 'color:#888;font-size:10px;';
        ts.textContent = new Date(rec.ts).toLocaleTimeString();
        mHeader.appendChild(ts);
        if (rec.error) {
          const errBadge = document.createElement('span');
          errBadge.style.cssText = 'color:#f44;font-size:10px;';
          errBadge.textContent = 'ERR';
          mHeader.appendChild(errBadge);
        }
      }
      mRow.appendChild(mHeader);

      if (rec?.payload !== undefined) {
        const payload = document.createElement('details');
        const ps = document.createElement('summary');
        ps.style.cssText = 'color:#888;font-size:10px;cursor:pointer;';
        ps.textContent = 'Last payload';
        payload.appendChild(ps);
        const pre = document.createElement('pre');
        pre.style.cssText = 'margin:0;font-size:10px;color:#ce9178;overflow:auto;max-height:80px;';
        pre.textContent = JSON.stringify(rec.payload, null, 2);
        payload.appendChild(pre);
        mRow.appendChild(payload);
      }

      body.appendChild(mRow);
    }

    section.appendChild(body);
    root.appendChild(section);
  }

  return root;
}
