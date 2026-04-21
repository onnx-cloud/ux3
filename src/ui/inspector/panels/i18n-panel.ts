/**
 * i18n Panel — flat table of all i18n keys with search and missing-key detection.
 */

import type { AppContext } from '../../app.js';

function flattenI18n(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object') {
      Object.assign(out, flattenI18n(v, fullKey));
    } else {
      out[fullKey] = String(v ?? '');
    }
  }
  return out;
}

export function createI18nPanel(ctx: AppContext): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'padding:8px;overflow:auto;height:100%;box-sizing:border-box;font-size:11px;';

  // Extract flat map from config.i18n
  const rawI18n = (ctx.config as any)?.i18n ?? {};
  const flatMap = flattenI18n(rawI18n);
  const allEntries = Object.entries(flatMap); // [key, value]

  // Controls row
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;align-items:center;';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search keys or values…';
  searchInput.style.cssText =
    'flex:1;background:var(--ins-bg);color:var(--ins-text);border:1px solid var(--ins-border);padding:3px 6px;border-radius:3px;font-size:11px;';

  const missingToggle = document.createElement('label');
  missingToggle.style.cssText = 'font-size:11px;display:flex;gap:4px;align-items:center;cursor:pointer;white-space:nowrap;';
  const missingChk = document.createElement('input');
  missingChk.type = 'checkbox';
  missingToggle.appendChild(missingChk);
  missingToggle.appendChild(document.createTextNode('Missing only'));

  controls.appendChild(searchInput);
  controls.appendChild(missingToggle);
  root.appendChild(controls);

  // Table
  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:11px;';

  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  for (const h of ['Key', 'Value']) {
    const th = document.createElement('th');
    th.textContent = h;
    th.style.cssText =
      'text-align:left;padding:3px 6px;border-bottom:1px solid var(--ins-border);color:#888;position:sticky;top:0;background:var(--ins-bg);';
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  root.appendChild(table);

  const render = () => {
    const q = searchInput.value.toLowerCase();
    const onlyMissing = missingChk.checked;
    tbody.innerHTML = '';

    for (const [key, val] of allEntries) {
      const missing = !val;
      if (onlyMissing && !missing) continue;
      if (q && !key.toLowerCase().includes(q) && !val.toLowerCase().includes(q)) continue;

      const tr = document.createElement('tr');
      if (missing) tr.style.color = '#f44';

      const tdKey = document.createElement('td');
      tdKey.style.cssText = 'padding:2px 6px;border-bottom:1px solid var(--ins-border);font-family:monospace;';
      tdKey.textContent = key;

      const tdVal = document.createElement('td');
      tdVal.style.cssText = 'padding:2px 6px;border-bottom:1px solid var(--ins-border);';
      tdVal.textContent = val || '(missing)';

      tr.appendChild(tdKey);
      tr.appendChild(tdVal);
      tbody.appendChild(tr);
    }
  };

  let debounce: ReturnType<typeof setTimeout>;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(render, 150);
  });
  missingChk.addEventListener('change', render);

  render();
  return root;
}
