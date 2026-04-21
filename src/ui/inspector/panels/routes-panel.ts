/**
 * Routes Panel — table of registered routes with active-row highlight and click-to-navigate.
 */

import type { AppContext } from '../../app.js';
import { inspectorBus } from '../event-bus.js';

export function createRoutesPanel(ctx: AppContext): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'padding:8px;overflow:auto;height:100%;box-sizing:border-box;font-size:11px;';

  const nav = ctx.nav;

  const currentBar = document.createElement('div');
  currentBar.style.cssText = 'margin-bottom:8px;color:#888;';
  currentBar.textContent = `Current: ${nav?.current?.path ?? (window.location.hash || window.location.pathname)}`;
  root.appendChild(currentBar);

  if (!nav || !nav.routes || nav.routes.length === 0) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = 'No routes registered.';
    root.appendChild(empty);
    return root;
  }

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;';

  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  for (const h of ['Path', 'View', 'Guard', 'Active']) {
    const th = document.createElement('th');
    th.textContent = h;
    th.style.cssText =
      'text-align:left;padding:3px 6px;border-bottom:1px solid var(--ins-border);color:#888;position:sticky;top:0;background:var(--ins-bg);';
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const route of nav.routes) {
    const isActive = nav.current?.view === route.view;
    const tr = document.createElement('tr');
    tr.style.cssText = `cursor:pointer;${isActive ? 'background:rgba(15,52,96,0.6);' : ''}`;

    const tdPath = document.createElement('td');
    tdPath.style.cssText = 'padding:3px 6px;border-bottom:1px solid var(--ins-border);font-family:monospace;';
    tdPath.textContent = route.path;

    const tdView = document.createElement('td');
    tdView.style.cssText = 'padding:3px 6px;border-bottom:1px solid var(--ins-border);';
    tdView.textContent = route.view;

    const tdGuard = document.createElement('td');
    tdGuard.style.cssText = 'padding:3px 6px;border-bottom:1px solid var(--ins-border);color:#888;';
    tdGuard.textContent = (route as any).guard ?? '—';

    const tdActive = document.createElement('td');
    tdActive.style.cssText = 'padding:3px 6px;border-bottom:1px solid var(--ins-border);text-align:center;';
    tdActive.textContent = isActive ? '✓' : '';

    tr.appendChild(tdPath);
    tr.appendChild(tdView);
    tr.appendChild(tdGuard);
    tr.appendChild(tdActive);

    tr.addEventListener('click', () => {
      if (nav.canNavigate?.(route.view)) {
        window.location.hash = route.path;
        inspectorBus.emit('navigation', 'navigate', { path: route.path, view: route.view });
      }
    });

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  root.appendChild(table);
  return root;
}
