/**
 * Events Panel — chronological timeline from the inspector event bus.
 * Circular buffer (500 entries), filterable by source type, exportable.
 * Uses incremental rendering to append new events instead of full rebuild.
 */

import { inspectorBus, type InspectorEventSource } from '../event-bus.js';

const ALL_SOURCES: InspectorEventSource[] = ['fsm', 'service', 'navigation', 'plugin', 'logger', 'validation'];

const SOURCE_COLORS: Record<string, string> = {
  fsm: '#4caf50',
  service: '#2196f3',
  navigation: '#ff9800',
  plugin: '#9c27b0',
  logger: '#888',
  validation: '#f44336',
};

function buildRow(ev: { ts: number; source: string; type: string; payload?: unknown }): HTMLElement {
  const row = document.createElement('div');
  row.style.cssText = 'padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;gap:6px;';

  const time = document.createElement('span');
  time.style.cssText = 'color:var(--ins-muted,#888);min-width:70px;';
  time.textContent = new Date(ev.ts).toLocaleTimeString();

  const src = document.createElement('span');
  src.style.cssText = `color:${SOURCE_COLORS[ev.source] ?? 'var(--ins-text)'};min-width:70px;`;
  src.textContent = ev.source;

  const type = document.createElement('span');
  type.style.cssText = 'color:var(--ins-string,#dcdcaa);min-width:100px;';
  type.textContent = ev.type;

  const payload = document.createElement('span');
  payload.style.cssText = 'color:var(--ins-value,#ce9178);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;';
  if (ev.payload !== undefined) {
    payload.textContent = JSON.stringify(ev.payload);
    payload.title = JSON.stringify(ev.payload, null, 2);
  }

  row.append(time, src, type, payload);
  return row;
}

export function createEventsPanel(_ctx?: any): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'padding:8px;display:flex;flex-direction:column;height:100%;box-sizing:border-box;font-size:11px;';

  // Filter controls
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;align-items:center;';

  const activeFilters = new Set<InspectorEventSource>(ALL_SOURCES);

  const checkboxes = new Map<InspectorEventSource, HTMLInputElement>();
  for (const src of ALL_SOURCES) {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;gap:3px;align-items:center;cursor:pointer;font-size:11px;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.addEventListener('change', () => {
      if (cb.checked) activeFilters.add(src);
      else activeFilters.delete(src);
      fullRender();
    });
    checkboxes.set(src, cb);
    label.appendChild(cb);
    label.appendChild(document.createTextNode(src));
    controls.appendChild(label);
  }

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export JSON';
  exportBtn.style.cssText =
    'margin-left:auto;background:var(--ins-accent);color:var(--ins-text);border:none;padding:2px 8px;border-radius:3px;cursor:pointer;font-size:11px;font-family:inherit;';
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(inspectorBus.getAll(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ux3-events-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  controls.appendChild(exportBtn);
  root.appendChild(controls);

  // Log area
  const log = document.createElement('div');
  log.style.cssText = 'flex:1;overflow:auto;font-family:monospace;font-size:11px;border:1px solid var(--ins-border);border-radius:3px;padding:4px;';
  root.appendChild(log);

  // Track rendered count for incremental updates
  let renderedCount = 0;

  const fullRender = () => {
    log.innerHTML = '';
    renderedCount = 0;
    const events = inspectorBus.getAll().filter(e => activeFilters.has(e.source));
    // Reverse order: newest first
    for (let i = events.length - 1; i >= 0; i--) {
      const row = buildRow(events[i]);
      log.appendChild(row);
    }
    renderedCount = events.length;
  };

  const appendNew = () => {
    const events = inspectorBus.getAll();
    if (events.length <= renderedCount) return;
    const newEvents = events.slice(renderedCount).filter(e => activeFilters.has(e.source));
    // Prepend new events so newest appears at top
    for (let i = newEvents.length - 1; i >= 0; i--) {
      const row = buildRow(newEvents[i]);
      log.insertBefore(row, log.firstChild);
    }
    renderedCount = events.length;
  };

  fullRender();

  // Subscribe to new events — use incremental append for performance
  const unsub = inspectorBus.subscribe(() => appendNew());

  // Cleanup
  const obs = new MutationObserver(() => {
    if (!root.isConnected) {
      unsub();
      obs.disconnect();
    }
  });
  if (root.parentNode) obs.observe(root.parentNode, { childList: true });

  return root;
}
