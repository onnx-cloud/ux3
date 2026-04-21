/**
 * Plugins Panel — driven from window.__pluginInspector registry.
 */

declare global {
  interface Window {
    __pluginInspector?: Array<{
      name: string;
      version?: string;
      hooks?: string[];
      status?: string;
    }>;
  }
}

export function createPluginsPanel(): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'padding:8px;overflow:auto;height:100%;box-sizing:border-box;font-size:11px;';

  const plugins = window.__pluginInspector ?? [];

  if (plugins.length === 0) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = 'No plugins registered via window.__pluginInspector.';
    root.appendChild(empty);
    return root;
  }

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;';

  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  for (const h of ['Name', 'Version', 'Hooks', 'Status']) {
    const th = document.createElement('th');
    th.textContent = h;
    th.style.cssText =
      'text-align:left;padding:3px 6px;border-bottom:1px solid var(--ins-border);color:#888;position:sticky;top:0;background:var(--ins-bg);';
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const plugin of plugins) {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.style.cssText = 'padding:3px 6px;border-bottom:1px solid var(--ins-border);font-weight:bold;';
    tdName.textContent = plugin.name;

    const tdVer = document.createElement('td');
    tdVer.style.cssText = 'padding:3px 6px;border-bottom:1px solid var(--ins-border);color:#888;';
    tdVer.textContent = plugin.version ?? '—';

    const tdHooks = document.createElement('td');
    tdHooks.style.cssText = 'padding:3px 6px;border-bottom:1px solid var(--ins-border);';
    if (plugin.hooks && plugin.hooks.length > 0) {
      const det = document.createElement('details');
      const s = document.createElement('summary');
      s.style.cursor = 'pointer';
      s.textContent = `${plugin.hooks.length} hooks`;
      det.appendChild(s);
      plugin.hooks.forEach(h => {
        const chip = document.createElement('div');
        chip.style.cssText = 'font-size:10px;color:#9cdcfe;margin-left:8px;';
        chip.textContent = h;
        det.appendChild(chip);
      });
      tdHooks.appendChild(det);
    } else {
      tdHooks.textContent = '—';
      tdHooks.style.color = '#888';
    }

    const tdStatus = document.createElement('td');
    tdStatus.style.cssText = 'padding:3px 6px;border-bottom:1px solid var(--ins-border);';
    tdStatus.textContent = plugin.status ?? 'active';
    tdStatus.style.color = (plugin.status === 'error' || plugin.status === 'disabled') ? '#f44' : '#4caf50';

    tr.appendChild(tdName);
    tr.appendChild(tdVer);
    tr.appendChild(tdHooks);
    tr.appendChild(tdStatus);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  root.appendChild(table);
  return root;
}
