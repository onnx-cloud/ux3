/**
 * Inspector Shell — plugin-owned, tabbed dev inspector with service-driven state.
 *
 * Replaces the legacy monolithic JSON dump with a tabbed interface backed by
 * existing panel modules and the dev-tools service.
 */
import type { AppContext } from '../../../../src/ui/app.js';

const TABS: Array<{ id: string; label: string }> = [
  { id: 'summary', label: 'Summary' },
  { id: 'fsm', label: 'FSM' },
  { id: 'context', label: 'Context' },
  { id: 'i18n', label: 'i18n' },
  { id: 'routes', label: 'Routes' },
  { id: 'services', label: 'Services' },
  { id: 'styles', label: 'Styles' },
  { id: 'logic', label: 'Logic' },
  { id: 'plugins', label: 'Plugins' },
  { id: 'events', label: 'Events' },
  { id: 'validation', label: 'Validation' },
  { id: 'about', label: 'About App' },
];

type DockTarget = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right' | 'custom';

const MARGIN = 16;

export interface InspectorShellOptions {
  dock?: DockTarget;
  minimized?: boolean;
}

export function createInspectorShell(
  appContext: AppContext,
  options: InspectorShellOptions = {}
): { root: HTMLElement; dispose: () => void } {
  const devTools = (appContext.utils as any)?.devTools;
  const disposers: Array<() => void> = [];

  let dockTarget: DockTarget = options.dock || 'bottom-right';
  let minimized = options.minimized ?? true;
  let activePanel = devTools?.getSnapshot?.()?.activePanel || 'fsm';

  // =========================================================================
  // Build DOM
  // =========================================================================
  const root = document.createElement('aside');
  root.id = 'ux3-devtools-inspector';
  root.style.cssText = [
    'position:fixed',
    'z-index:2147483647',
    'width:min(480px,calc(100vw - 24px))',
    'max-height:70vh',
    'background:#0f172a',
    'color:#e2e8f0',
    'border:1px solid #334155',
    'border-radius:10px',
    'box-shadow:0 20px 50px rgba(15,23,42,0.45)',
    'font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace',
    'overflow:hidden',
    'opacity:0.5',
    'transition:opacity 140ms ease',
    'display:flex',
    'flex-direction:column',
  ].join(';');

  // ---- header ----
  const header = document.createElement('div');
  header.style.cssText =
    'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#111827;border-bottom:1px solid #334155;cursor:move;user-select:none;gap:8px;flex-shrink:0;';

  const title = document.createElement('strong');
  title.textContent = 'UX3 Dev Inspector';
  title.style.cssText = 'font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:#93c5fd;';

  const summary = document.createElement('span');
  summary.style.cssText =
    'font-size:11px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;';

  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.textContent = '↻';
  refreshBtn.style.cssText =
    'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:13px;line-height:1;';
  refreshBtn.addEventListener('click', () => refreshActivePanel());

  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.textContent = minimized ? '□' : '_';
  collapseBtn.style.cssText =
    'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:13px;line-height:1;';
  collapseBtn.addEventListener('click', toggleMinimized);

  header.append(title, refreshBtn, collapseBtn);
  // ---- end header ----

  // ---- tab bar ----
  const tabBar = document.createElement('div');
  tabBar.style.cssText =
    'display:flex;overflow-x:auto;flex-shrink:0;background:#111827;border-bottom:1px solid #1e293b;gap:2px;padding:4px 6px 0;';
  tabBar.classList.add('ux3-inspector-tabbar');

  for (const tab of TABS) {
    const tabBtn = document.createElement('button');
    tabBtn.type = 'button';
    tabBtn.textContent = tab.label;
    tabBtn.dataset.panelId = tab.id;
    tabBtn.style.cssText = [
      'padding:4px 10px',
      'border:none',
      'border-radius:6px 6px 0 0',
      'background:transparent',
      'color:#94a3b8',
      'font-size:11px',
      'cursor:pointer',
      'white-space:nowrap',
      'transition:background 0.15s,color 0.15s',
      'font-family:inherit',
    ].join(';');
    tabBtn.addEventListener('click', () => switchPanel(tab.id));
    tabBar.appendChild(tabBtn);
  }
  // ---- end tab bar ----

  // ---- panel body ----
  const panelHost = document.createElement('div');
  panelHost.style.cssText =
    'flex:1;overflow:auto;min-height:0;';
  panelHost.classList.add('ux3-inspector-panel-host');

  // placeholder
  const placeholder = document.createElement('div');
  placeholder.style.cssText = 'padding:12px;color:#64748b;text-align:center;';
  placeholder.textContent = 'Select a panel';
  panelHost.appendChild(placeholder);

  // ---- assemble ----
  root.append(header, tabBar, panelHost);

  // =========================================================================
  // Positioning helpers
  // =========================================================================

  function setRootPosition(left: number, top: number) {
    root.style.left = `${Math.max(MARGIN, Math.round(left))}px`;
    root.style.top = `${Math.max(MARGIN, Math.round(top))}px`;
    root.style.right = 'auto';
    root.style.bottom = 'auto';
  }

  function applyDock(target: Exclude<DockTarget, 'custom'>) {
    const rect = root.getBoundingClientRect();
    const width = Math.max(280, rect.width || 480);
    const height = Math.max(44, rect.height || 220);
    const maxLeft = Math.max(MARGIN, window.innerWidth - width - MARGIN);
    const maxTop = Math.max(MARGIN, window.innerHeight - height - MARGIN);
    let left = maxLeft;
    let top = maxTop;

    if (target === 'top-left') { left = MARGIN; top = MARGIN; }
    else if (target === 'top-right') { left = maxLeft; top = MARGIN; }
    else if (target === 'bottom-left') { left = MARGIN; top = maxTop; }
    else if (target === 'center') {
      left = Math.max(MARGIN, (window.innerWidth - width) / 2);
      top = Math.max(MARGIN, (window.innerHeight - height) / 2);
    }

    setRootPosition(left, top);
    dockTarget = target;
  }

  function updateMinimizedVisuals() {
    panelHost.style.display = minimized ? 'none' : 'block';
    tabBar.style.display = minimized ? 'none' : 'flex';
    collapseBtn.textContent = minimized ? '□' : '_';
    root.style.opacity = minimized ? '0.5' : '1';
    root.style.maxHeight = minimized ? 'none' : '70vh';
    header.style.borderBottom = minimized ? 'none' : '1px solid #334155';
    summary.style.display = minimized ? 'inline' : 'none';
    title.style.display = minimized ? 'none' : 'inline';
  }

  function toggleMinimized() {
    minimized = !minimized;
    updateMinimizedVisuals();
    if (!minimized && dockTarget !== 'custom') {
      applyDock(dockTarget as Exclude<DockTarget, 'custom'>);
    }
    if (!minimized && !panelHost.querySelector('.ux3-inspector-panel')) {
      switchPanel(activePanel);
    }
  }

  // ---- hover effects ----
  root.addEventListener('mouseenter', () => { if (minimized) root.style.opacity = '0.9'; });
  root.addEventListener('mouseleave', () => { if (minimized) root.style.opacity = '0.5'; });

  // ---- drag ----
  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function onPointerMove(event: PointerEvent) {
    if (!dragging) return;
    setRootPosition(event.clientX - dragOffsetX, event.clientY - dragOffsetY);
  }

  function stopDragging() {
    dragging = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDragging);
  }

  header.addEventListener('pointerdown', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target || target.closest('button,select,input,textarea,a')) return;
    const rect = root.getBoundingClientRect();
    dragging = true;
    dockTarget = 'custom';
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDragging);
  });

  function onResize() {
    if (dockTarget !== 'custom') applyDock(dockTarget as Exclude<DockTarget, 'custom'>);
  }
  window.addEventListener('resize', onResize);
  disposers.push(() => window.removeEventListener('resize', onResize));

  // =========================================================================
  // Panel switching
  // =========================================================================

  let currentPanelDisposer: (() => void) | null = null;

  function refreshActivePanel() {
    switchPanel(activePanel);
  }

  function switchPanel(panelId: string) {
    activePanel = panelId;

    // Update tab bar highlights
    tabBar.querySelectorAll('button').forEach((btn) => {
      const el = btn as HTMLButtonElement;
      el.style.background = el.dataset.panelId === panelId ? '#1e293b' : 'transparent';
      el.style.color = el.dataset.panelId === panelId ? '#93c5fd' : '#94a3b8';
    });

    // Sync to devTools service
    if (devTools && typeof devTools.open === 'function') {
      devTools.open(panelId);
    }

    // Dispose previous panel
    if (currentPanelDisposer) {
      try { currentPanelDisposer(); } catch { /* noop */ }
      currentPanelDisposer = null;
    }

    // Clear host
    panelHost.innerHTML = '';

    // Lazy-load panel
    loadPanel(panelId).then((panelEl) => {
      if (activePanel !== panelId) return; // race guard
      panelHost.innerHTML = '';
      if (panelEl) {
        panelEl.classList.add('ux3-inspector-panel');
        panelHost.appendChild(panelEl);
      } else {
        const msg = document.createElement('div');
        msg.style.cssText = 'padding:12px;color:#64748b;text-align:center;';
        msg.textContent = `Panel "${panelId}" not available`;
        panelHost.appendChild(msg);
      }
    }).catch(() => {
      if (activePanel !== panelId) return;
      const err = document.createElement('div');
      err.style.cssText = 'padding:12px;color:#f87171;';
      err.textContent = `Failed to load panel "${panelId}"`;
      panelHost.innerHTML = '';
      panelHost.appendChild(err);
    });
  }

  async function loadPanel(panelId: string): Promise<HTMLElement | null> {
    switch (panelId) {
      case 'fsm': {
        const { createFsmPanel } = await import('@ux3/ui/inspector/panels/fsm-panel.js');
        return createFsmPanel(appContext);
      }
      case 'context': {
        const { createContextPanel } = await import('@ux3/ui/inspector/panels/context-panel.js');
        return createContextPanel(appContext);
      }
      case 'i18n': {
        const { createI18nPanel } = await import('@ux3/ui/inspector/panels/i18n-panel.js');
        return createI18nPanel(appContext);
      }
      case 'routes': {
        const { createRoutesPanel } = await import('@ux3/ui/inspector/panels/routes-panel.js');
        return createRoutesPanel(appContext);
      }
      case 'services': {
        const { createServicesPanel } = await import('@ux3/ui/inspector/panels/services-panel.js');
        return createServicesPanel(appContext);
      }
      case 'styles': {
        const { createStylesPanel } = await import('@ux3/ui/inspector/panels/styles-panel.js');
        return createStylesPanel(appContext);
      }
      case 'logic': {
        const { createLogicPanel } = await import('@ux3/ui/inspector/panels/logic-panel.js');
        return createLogicPanel(appContext);
      }
      case 'plugins': {
        const { createPluginsPanel } = await import('@ux3/ui/inspector/panels/plugins-panel.js');
        return createPluginsPanel(appContext);
      }
      case 'events': {
        const { createEventsPanel } = await import('@ux3/ui/inspector/panels/events-panel.js');
        return createEventsPanel(appContext);
      }
      case 'validation': {
        const { createValidationPanel } = await import('@ux3/ui/inspector/panels/validation-panel.js');
        return createValidationPanel(appContext);
      }
      case 'summary': {
        return createSummaryPanel(appContext);
      }
      case 'about': {
        return createAboutPanel(appContext);
      }
      default:
        return null;
    }
  }

  // =========================================================================
  // Summary panel (inline)
  // =========================================================================
  function createSummaryPanel(ctx: AppContext): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'padding:12px;font-size:12px;';

    const devToolsSnapshot = devTools?.getSnapshot?.();
    const machines = Object.keys(ctx.machines || {}).length;
    const services = Object.keys(ctx.services || {}).length;
    const routes = ctx.nav?.routes?.length ?? 0;
    const events = devToolsSnapshot?.events?.length ?? 0;
    const plugins = devToolsSnapshot?.plugins?.length ?? 0;

    const items = [
      ['Active Route', typeof window !== 'undefined' ? window.location.pathname : '/'],
      ['FSM Machines', String(machines)],
      ['Services', String(services)],
      ['Routes', String(routes)],
      ['Events', String(events)],
      ['Plugins', String(plugins)],
      ['Active Panel', activePanel],
      ['Inspector Open', devToolsSnapshot?.open ? 'yes' : 'no'],
    ];

    for (const [label, value] of items) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e293b;';
      const l = document.createElement('span');
      l.style.color = '#94a3b8';
      l.textContent = label;
      const v = document.createElement('span');
      v.textContent = value;
      row.append(l, v);
      container.appendChild(row);
    }
    return container;
  }

  // =========================================================================
  // About panel (inline)
  // =========================================================================
  function createAboutPanel(ctx: AppContext): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'padding:12px;font-size:12px;';
    const config = ctx.config || {};

    const items = [
      ['Version', config.version || 'unknown'],
      ['Site Name', config.site?.name || '—'],
      ['Development', config.development ? 'yes' : 'no'],
      ['Hot Reload', config.development?.hotReload ? 'yes' : 'no'],
      ['Log Level', config.development?.logging || 'info'],
    ];

    for (const [label, value] of items) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e293b;';
      const l = document.createElement('span');
      l.style.color = '#94a3b8';
      l.textContent = label;
      const v = document.createElement('span');
      v.textContent = String(value);
      row.append(l, v);
      container.appendChild(row);
    }
    return container;
  }

  // =========================================================================
  // Subscribe to devTools for activePanel changes
  // =========================================================================
  if (devTools && typeof devTools.subscribe === 'function') {
    disposers.push(
      devTools.subscribe((snapshot: any) => {
        if (snapshot.activePanel && snapshot.activePanel !== activePanel) {
          switchPanel(snapshot.activePanel);
        }
      })
    );
  }

  // =========================================================================
  // Cleanup
  // =========================================================================
  function dispose() {
    stopDragging();
    if (currentPanelDisposer) {
      try { currentPanelDisposer(); } catch { /* noop */ }
    }
    for (const d of disposers) {
      try { d(); } catch { /* noop */ }
    }
  }

  // initial render
  updateMinimizedVisuals();
  applyDock('bottom-right');

  return { root, dispose };
}
