/**
 * Styles Panel — token table with computed classes and applied-to elements.
 */

import type { AppContext } from '../../app.js';

export function createStylesPanel(ctx: AppContext): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'padding:8px;overflow:auto;height:100%;box-sizing:border-box;font-size:11px;';

  const styles = ctx.styles ?? {};
  const tokens = Object.entries(styles);

  if (tokens.length === 0) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = 'No styles registered.';
    root.appendChild(empty);
    return root;
  }

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;';

  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  for (const h of ['Token', 'Classes', 'Applied To']) {
    const th = document.createElement('th');
    th.textContent = h;
    th.style.cssText =
      'text-align:left;padding:3px 6px;border-bottom:1px solid var(--ins-border);color:#888;position:sticky;top:0;background:var(--ins-bg);';
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  for (const [token, classes] of tokens) {
    const applied = Array.from(document.querySelectorAll(`[ux-style="${token}"]`));

    const tr = document.createElement('tr');

    const tdToken = document.createElement('td');
    tdToken.style.cssText = 'padding:3px 6px;border-bottom:1px solid var(--ins-border);font-family:monospace;color:#9cdcfe;';
    tdToken.textContent = token;

    const tdClasses = document.createElement('td');
    tdClasses.style.cssText = 'padding:3px 6px;border-bottom:1px solid var(--ins-border);word-break:break-all;color:#ce9178;';
    tdClasses.textContent = typeof classes === 'string' ? classes : JSON.stringify(classes);

    const tdApplied = document.createElement('td');
    tdApplied.style.cssText = 'padding:3px 6px;border-bottom:1px solid var(--ins-border);';

    if (applied.length === 0) {
      tdApplied.style.color = '#888';
      tdApplied.textContent = '—';
    } else {
      applied.forEach((el, i) => {
        const chip = document.createElement('span');
        chip.style.cssText =
          'display:inline-block;margin-right:4px;padding:1px 5px;border:1px solid var(--ins-border);border-radius:3px;cursor:pointer;font-size:10px;';
        chip.textContent = el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '');
        chip.title = 'Scroll into view';
        chip.addEventListener('click', () => {
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLElement).style.outline = '2px solid var(--ins-flash)';
          setTimeout(() => { (el as HTMLElement).style.outline = ''; }, 1500);
        });
        tdApplied.appendChild(chip);
        if (i < applied.length - 1) tdApplied.appendChild(document.createTextNode(' '));
      });
    }

    tr.appendChild(tdToken);
    tr.appendChild(tdClasses);
    tr.appendChild(tdApplied);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  root.appendChild(table);
  return root;
}
