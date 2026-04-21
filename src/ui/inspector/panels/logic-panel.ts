/**
 * Logic Panel — guards and actions extracted from FSM configs per machine.
 */

import type { AppContext } from '../../app.js';

export function createLogicPanel(ctx: AppContext): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'padding:8px;overflow:auto;height:100%;box-sizing:border-box;font-size:11px;';

  const machinesObj = ctx.machines as Record<string, any> | Map<string, any>;
  const entries: [string, any][] =
    machinesObj instanceof Map
      ? Array.from(machinesObj.entries())
      : Object.entries(machinesObj);

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.style.color = '#888';
    empty.textContent = 'No machines registered.';
    root.appendChild(empty);
    return root;
  }

  for (const [name, machine] of entries) {
    if (!machine) continue;

    const fsmConfig: any = (machine as any).config ?? (machine as any).FSM_CONFIG ?? (machine as any)._config;
    if (!fsmConfig) continue;

    const section = document.createElement('details');
    section.style.cssText = 'margin-bottom:8px;border:1px solid var(--ins-border);border-radius:4px;';

    const summary = document.createElement('summary');
    summary.style.cssText =
      'padding:6px 8px;cursor:pointer;background:var(--ins-accent);font-weight:bold;font-size:12px;';
    summary.textContent = name;
    section.appendChild(summary);

    const body = document.createElement('div');
    body.style.padding = '8px';

    // Walk all states to extract guards and actions
    const states = fsmConfig.states ?? {};
    for (const [stateName, stateConfig] of Object.entries(states as Record<string, any>)) {
      const guards: { event: string; guard: string }[] = [];
      const actions: { phase: string; name: string }[] = [];

      if (stateConfig.on) {
        for (const [evName, trans] of Object.entries(stateConfig.on as Record<string, any>)) {
          const t = typeof trans === 'string' ? {} : trans;
          if (t.guard) guards.push({ event: evName, guard: t.guard.name || t.guard.toString().slice(0, 60) });
          if (t.actions) {
            (t.actions as any[]).forEach(a => {
              actions.push({ phase: `on(${evName})`, name: a.name || a.toString().slice(0, 60) });
            });
          }
        }
      }
      if (stateConfig.entry) {
        (stateConfig.entry as any[]).forEach(a =>
          actions.push({ phase: 'entry', name: a.name || a.toString().slice(0, 60) })
        );
      }
      if (stateConfig.exit) {
        (stateConfig.exit as any[]).forEach(a =>
          actions.push({ phase: 'exit', name: a.name || a.toString().slice(0, 60) })
        );
      }

      if (guards.length === 0 && actions.length === 0) continue;

      const stateLabel = document.createElement('div');
      stateLabel.style.cssText = 'color:#9cdcfe;margin:4px 0 2px;font-weight:bold;';
      stateLabel.textContent = `State: ${stateName}`;
      body.appendChild(stateLabel);

      for (const g of guards) {
        const row = document.createElement('div');
        row.style.cssText = 'margin-left:12px;display:flex;gap:4px;';
        const badge = document.createElement('span');
        badge.style.cssText = 'color:#dcdcaa;font-size:10px;border:1px solid var(--ins-border);padding:0 4px;border-radius:2px;';
        badge.textContent = 'guard';
        const txt = document.createElement('span');
        txt.style.color = '#888';
        txt.textContent = `${g.event}: ${g.guard}`;
        row.appendChild(badge);
        row.appendChild(txt);
        body.appendChild(row);
      }

      for (const a of actions) {
        const row = document.createElement('div');
        row.style.cssText = 'margin-left:12px;display:flex;gap:4px;';
        const badge = document.createElement('span');
        badge.style.cssText = 'color:#c586c0;font-size:10px;border:1px solid var(--ins-border);padding:0 4px;border-radius:2px;';
        badge.textContent = a.phase;
        const txt = document.createElement('span');
        txt.style.color = '#888';
        txt.textContent = a.name;
        row.appendChild(badge);
        row.appendChild(txt);
        body.appendChild(row);
      }
    }

    section.appendChild(body);
    root.appendChild(section);
  }

  return root;
}
