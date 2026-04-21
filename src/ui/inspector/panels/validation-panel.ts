/**
 * Validation Panel — unified diagnostics from dev endpoints and runtime events.
 */

import { inspectorBus } from '../event-bus.js';

export interface Diagnostic {
  severity: 'error' | 'warn' | 'info';
  category: 'lint' | 'schema' | 'i18n' | 'style-token' | 'route' | 'fsm' | 'template' | 'unknown';
  file?: string;
  message: string;
  source: string;
  ts: number;
}

const diagnostics: Diagnostic[] = [];
let badgeCallback: ((count: number) => void) | null = null;

export function onBadgeUpdate(cb: (count: number) => void): void {
  badgeCallback = cb;
}

function notifyBadge(): void {
  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  badgeCallback?.(errorCount);
}

export function pushDiagnostic(d: Diagnostic): void {
  diagnostics.unshift(d);
  if (diagnostics.length > 1000) diagnostics.length = 1000;
  inspectorBus.emit('validation', d.severity, { message: d.message, category: d.category, file: d.file });
  notifyBadge();
}

// Listen to validation events from inspector bus
inspectorBus.subscribe(ev => {
  if (ev.source === 'validation') {
    const p = ev.payload as any;
    if (p?.message && !diagnostics.some(d => d.ts === ev.ts && d.message === p.message)) {
      diagnostics.unshift({
        severity: (['error', 'warn', 'info'].includes(ev.type) ? ev.type : 'info') as Diagnostic['severity'],
        category: p.category ?? 'unknown',
        file: p.file,
        message: p.message,
        source: p.source ?? 'runtime',
        ts: ev.ts,
      });
    }
  }
});

async function fetchDevDiagnostics(): Promise<void> {
  const endpoints = ['/$/stats', '/$/manifest'];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) continue;
      const data = await res.json();
      const errors: any[] = data?.errors ?? data?.diagnostics ?? [];
      for (const err of errors) {
        pushDiagnostic({
          severity: err.severity ?? 'error',
          category: err.category ?? 'unknown',
          file: err.file,
          message: err.message ?? String(err),
          source: url,
          ts: Date.now(),
        });
      }
    } catch {
      // dev server not running or endpoint not available — silently skip
    }
  }
}

// Poll dev endpoints every 5s when panel is rendered
let pollTimer: ReturnType<typeof setInterval> | null = null;

export function createValidationPanel(): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'padding:8px;display:flex;flex-direction:column;height:100%;box-sizing:border-box;font-size:11px;';

  // Start polling
  fetchDevDiagnostics();
  if (!pollTimer) {
    pollTimer = setInterval(fetchDevDiagnostics, 5000);
  }

  // Filter controls
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;';

  let activeSeverity = new Set(['error', 'warn', 'info']);
  let fileFilter = '';

  for (const sev of ['error', 'warn', 'info']) {
    const lbl = document.createElement('label');
    lbl.style.cssText = 'display:flex;gap:3px;align-items:center;cursor:pointer;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.addEventListener('change', () => {
      if (cb.checked) activeSeverity.add(sev);
      else activeSeverity.delete(sev);
      render();
    });
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(sev));
    controls.appendChild(lbl);
  }

  const fileInput = document.createElement('input');
  fileInput.type = 'text';
  fileInput.placeholder = 'Filter by file…';
  fileInput.style.cssText =
    'flex:1;background:var(--ins-bg);color:var(--ins-text);border:1px solid var(--ins-border);padding:2px 6px;border-radius:3px;font-size:11px;';
  let debounce: ReturnType<typeof setTimeout>;
  fileInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { fileFilter = fileInput.value; render(); }, 150);
  });
  controls.appendChild(fileInput);
  root.appendChild(controls);

  // Table
  const tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'flex:1;overflow:auto;';

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;';

  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  for (const h of ['Sev', 'Category', 'File', 'Message', 'Source', '']) {
    const th = document.createElement('th');
    th.textContent = h;
    th.style.cssText =
      'text-align:left;padding:3px 6px;border-bottom:1px solid var(--ins-border);color:#888;position:sticky;top:0;background:var(--ins-bg);white-space:nowrap;';
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  root.appendChild(tableWrap);

  const SEV_COLORS: Record<string, string> = { error: '#f44', warn: '#ff9800', info: '#4caf50' };

  const render = () => {
    tbody.innerHTML = '';
    const filtered = diagnostics.filter(
      d => activeSeverity.has(d.severity) && (!fileFilter || (d.file ?? '').includes(fileFilter))
    );
    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.style.cssText = 'padding:12px;color:#888;text-align:center;';
      td.textContent = 'No diagnostics.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    for (const d of filtered) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--ins-border)';

      const tdSev = document.createElement('td');
      tdSev.style.cssText = `padding:2px 6px;color:${SEV_COLORS[d.severity] ?? '#fff'};font-weight:bold;white-space:nowrap;`;
      tdSev.textContent = d.severity.toUpperCase();

      const tdCat = document.createElement('td');
      tdCat.style.cssText = 'padding:2px 6px;color:#9cdcfe;white-space:nowrap;';
      tdCat.textContent = d.category;

      const tdFile = document.createElement('td');
      tdFile.style.cssText = 'padding:2px 6px;color:#888;font-size:10px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      tdFile.textContent = d.file ?? '—';
      tdFile.title = d.file ?? '';

      const tdMsg = document.createElement('td');
      tdMsg.style.cssText = 'padding:2px 6px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      tdMsg.textContent = d.message;
      tdMsg.title = d.message;

      const tdSrc = document.createElement('td');
      tdSrc.style.cssText = 'padding:2px 6px;color:#888;font-size:10px;white-space:nowrap;';
      tdSrc.textContent = d.source;

      const tdActions = document.createElement('td');
      tdActions.style.padding = '2px 6px';
      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy';
      copyBtn.style.cssText =
        'background:var(--ins-accent);color:var(--ins-text);border:none;padding:1px 5px;border-radius:2px;cursor:pointer;font-size:10px;';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(
          `[${d.severity.toUpperCase()}] ${d.category}${d.file ? ` (${d.file})` : ''}: ${d.message}`
        );
      });
      tdActions.appendChild(copyBtn);

      tr.appendChild(tdSev);
      tr.appendChild(tdCat);
      tr.appendChild(tdFile);
      tr.appendChild(tdMsg);
      tr.appendChild(tdSrc);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    }
  };

  render();

  // Re-render on new events
  const unsub = inspectorBus.subscribe(() => render());

  const obs = new MutationObserver(() => {
    if (!root.isConnected) {
      unsub();
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      obs.disconnect();
    }
  });
  if (root.parentNode) obs.observe(root.parentNode, { childList: true });

  return root;
}
