/**
 * Context Panel — recursive collapsible JSON tree of AppContext top-level sections.
 */

import type { AppContext } from '../../app.js';

function copyToClipboard(text: string): void {
  navigator.clipboard?.writeText(text).catch(() => {/* noop */});
}

function buildTree(value: unknown, depth = 0): HTMLElement {
  const container = document.createElement('div');
  container.style.marginLeft = depth > 0 ? '14px' : '0';

  if (value === null || value === undefined || typeof value !== 'object') {
    const leaf = document.createElement('span');
    leaf.style.cssText = typeof value === 'string'
      ? 'color:#ce9178'
      : typeof value === 'number' || typeof value === 'boolean'
        ? 'color:#b5cea8'
        : 'color:#888';
    leaf.textContent = JSON.stringify(value) ?? 'undefined';

    // copy on hover
    leaf.addEventListener('mouseenter', () => { leaf.style.outline = '1px dotted var(--ins-accent)'; });
    leaf.addEventListener('mouseleave', () => { leaf.style.outline = ''; });
    leaf.title = 'Click to copy';
    leaf.style.cursor = 'copy';
    leaf.addEventListener('click', () => copyToClipboard(String(value)));
    container.appendChild(leaf);
    return container;
  }

  if (Array.isArray(value)) {
    const arr = document.createElement('details');
    arr.open = depth < 2;
    const s = document.createElement('summary');
    s.style.cssText = 'cursor:pointer;color:#9cdcfe;font-size:11px;';
    s.textContent = `Array(${value.length})`;
    arr.appendChild(s);
    value.forEach((item, i) => {
      const row = document.createElement('div');
      const idx = document.createElement('span');
      idx.style.color = '#888';
      idx.textContent = `[${i}]: `;
      row.appendChild(idx);
      row.appendChild(buildTree(item, depth + 1));
      arr.appendChild(row);
    });
    container.appendChild(arr);
    return container;
  }

  const obj = value as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === 'object') {
      const det = document.createElement('details');
      det.open = depth < 2;
      const s = document.createElement('summary');
      s.style.cssText = 'cursor:pointer;color:#9cdcfe;font-size:11px;display:inline-block;';
      s.textContent = k;
      det.appendChild(s);
      det.appendChild(buildTree(v, depth + 1));
      container.appendChild(det);
    } else {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:4px;align-items:baseline;margin:1px 0;';
      const key = document.createElement('span');
      key.style.color = '#9cdcfe';
      key.textContent = k + ':';
      row.appendChild(key);
      row.appendChild(buildTree(v, 0));
      container.appendChild(row);
    }
  }
  return container;
}

export function createContextPanel(ctx: AppContext): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'padding:8px;overflow:auto;height:100%;box-sizing:border-box;font-size:11px;';

  const sections: [string, unknown][] = [
    ['config', ctx.config],
    ['nav', ctx.nav],
    ['ui', ctx.ui],
    ['styles', ctx.styles],
    ['utils', (ctx as any).utils],
    ['services (keys)', Object.keys(ctx.services)],
    ['machines (keys)', ctx.machines instanceof Map ? Array.from(ctx.machines.keys()) : Object.keys(ctx.machines)],
  ];

  for (const [label, data] of sections) {
    const section = document.createElement('details');
    section.open = false;
    section.style.cssText = 'margin-bottom:6px;border:1px solid var(--ins-border);border-radius:4px;';

    const summary = document.createElement('summary');
    summary.style.cssText = 'padding:5px 8px;cursor:pointer;background:var(--ins-accent);font-weight:bold;font-size:12px;';
    summary.textContent = label;
    section.appendChild(summary);

    const body = document.createElement('div');
    body.style.padding = '8px';
    // Lazy render on first open
    let rendered = false;
    section.addEventListener('toggle', () => {
      if (section.open && !rendered) {
        rendered = true;
        body.appendChild(buildTree(data));
      }
    });
    section.appendChild(body);
    root.appendChild(section);
  }

  return root;
}
