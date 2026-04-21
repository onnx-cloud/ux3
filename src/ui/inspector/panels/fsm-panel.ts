/**
 * FSM Panel — shows state, context, history and send-event control per machine.
 */

import type { AppContext } from '../../app.js';
import { inspectorBus } from '../event-bus.js';

const HISTORY_MAX = 5;

interface MachineRow {
  name: string;
  el: HTMLElement;
  historyBuf: string[];
  unsub: () => void;
}

function flash(el: HTMLElement): void {
  el.style.background = 'var(--ins-flash)';
  el.style.color = '#000';
  setTimeout(() => {
    el.style.background = '';
    el.style.color = '';
  }, 600);
}

function renderKV(obj: unknown, depth = 0): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = `margin-left:${depth * 12}px`;
  if (obj === null || obj === undefined) {
    const s = document.createElement('span');
    s.style.color = '#888';
    s.textContent = String(obj);
    wrap.appendChild(s);
    return wrap;
  }
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    const s = document.createElement('span');
    s.style.color = Array.isArray(obj) ? '#9cdcfe' : '#ce9178';
    s.textContent = JSON.stringify(obj);
    wrap.appendChild(s);
    return wrap;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '4px';
    const key = document.createElement('span');
    key.style.color = '#9cdcfe';
    key.textContent = k + ':';
    row.appendChild(key);
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      row.style.flexDirection = 'column';
      row.appendChild(renderKV(v, depth + 1));
    } else {
      row.appendChild(renderKV(v, 0));
    }
    wrap.appendChild(row);
  }
  return wrap;
}

export function createFsmPanel(ctx: AppContext): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'padding:8px;overflow:auto;height:100%;box-sizing:border-box;';

  const rows: MachineRow[] = [];

  const machinesObj = ctx.machines as Record<string, any> | Map<string, any>;
  const entries: [string, any][] =
    machinesObj instanceof Map
      ? Array.from(machinesObj.entries())
      : Object.entries(machinesObj);

  for (const [name, machine] of entries) {
    if (!machine) continue;

    const section = document.createElement('details');
    section.style.cssText = 'margin-bottom:8px;border:1px solid var(--ins-border);border-radius:4px;';
    section.open = true;

    const summary = document.createElement('summary');
    summary.style.cssText =
      'padding:6px 8px;cursor:pointer;background:var(--ins-accent);font-weight:bold;font-size:12px;display:flex;gap:8px;align-items:center;';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    const stateChip = document.createElement('span');
    stateChip.style.cssText =
      'font-size:11px;padding:1px 6px;border-radius:10px;background:rgba(255,255,255,0.15);transition:background 0.3s,color 0.3s;';
    stateChip.textContent = machine.getState?.() ?? '?';

    summary.appendChild(nameSpan);
    summary.appendChild(stateChip);
    section.appendChild(summary);

    const body = document.createElement('div');
    body.style.cssText = 'padding:8px;font-size:11px;';

    // History
    const histEl = document.createElement('div');
    histEl.style.cssText = 'margin-bottom:6px;color:#888;font-size:10px;';
    body.appendChild(histEl);

    const histBuf: string[] = [machine.getState?.() ?? '?'];
    const updateHist = () => {
      histEl.textContent = 'History: ' + histBuf.slice(-HISTORY_MAX).join(' → ');
    };
    updateHist();

    // Context tree
    const ctxLabel = document.createElement('div');
    ctxLabel.style.cssText = 'color:#888;font-size:10px;margin-bottom:4px;';
    ctxLabel.textContent = 'Context';
    body.appendChild(ctxLabel);

    const ctxTree = document.createElement('div');
    ctxTree.style.cssText = 'transition:background 0.3s;border-radius:2px;margin-bottom:8px;';
    const rebuildCtx = () => {
      ctxTree.innerHTML = '';
      const c = machine.getContext?.() ?? {};
      ctxTree.appendChild(renderKV(c));
    };
    rebuildCtx();
    body.appendChild(ctxTree);

    // Send-event control
    const sendRow = document.createElement('div');
    sendRow.style.cssText = 'display:flex;gap:4px;';
    const sendInput = document.createElement('input');
    sendInput.type = 'text';
    sendInput.placeholder = 'event type';
    sendInput.style.cssText =
      'flex:1;background:var(--ins-bg);color:var(--ins-text);border:1px solid var(--ins-border);padding:2px 6px;border-radius:3px;font-size:11px;';
    const sendBtn = document.createElement('button');
    sendBtn.textContent = '→';
    sendBtn.style.cssText =
      'background:var(--ins-accent);color:var(--ins-text);border:none;padding:2px 8px;border-radius:3px;cursor:pointer;font-size:11px;';
    sendBtn.addEventListener('click', () => {
      const ev = sendInput.value.trim();
      if (ev && machine.send) {
        machine.send({ type: ev });
        inspectorBus.emit('fsm', 'send', { machine: name, event: ev });
        sendInput.value = '';
      }
    });
    sendInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') sendBtn.click();
    });
    sendRow.appendChild(sendInput);
    sendRow.appendChild(sendBtn);
    body.appendChild(sendRow);

    section.appendChild(body);
    root.appendChild(section);

    // Subscribe
    let unsub: () => void = () => {};
    if (typeof machine.subscribe === 'function') {
      unsub = machine.subscribe((state: string, _context: unknown) => {
        histBuf.push(state);
        stateChip.textContent = state;
        flash(stateChip);
        updateHist();
        rebuildCtx();
        flash(ctxTree);
        inspectorBus.emit('fsm', 'transition', { machine: name, state });
      });
    }

    rows.push({ name, el: section, historyBuf: histBuf, unsub });
  }

  // Cleanup on removal
  const observer = new MutationObserver(() => {
    if (!root.isConnected) {
      rows.forEach(r => r.unsub());
      observer.disconnect();
    }
  });
  if (root.parentNode) observer.observe(root.parentNode, { childList: true });

  return root;
}
