/**
 * Inspector Shell — plugin-owned, tabbed dev inspector with service-driven state.
 *
 * Replaces the legacy monolithic JSON dump with a tabbed interface backed by
 * existing panel modules and the dev-tools service.
 */
import type { AppContext } from '@ux3/ui/app.js';

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
    '--ins-bg:#0f172a',
    '--ins-accent:#1e3a5f',
    '--ins-text:#e2e8f0',
    '--ins-border:#334155',
    '--ins-flash:#fbbf24',
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
  collapseBtn.title = minimized ? 'Expand' : 'Minimize';
  collapseBtn.style.cssText =
    'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:13px;line-height:1;';
  collapseBtn.addEventListener('click', toggleMinimized);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Close inspector';
  closeBtn.style.cssText =
    'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:13px;line-height:1;';
  closeBtn.addEventListener('click', () => {
    dispose();
    root.remove();
  });

  const pickBtn = document.createElement('button');
  pickBtn.type = 'button';
  pickBtn.textContent = '🔍';
  pickBtn.title = 'Inspect elements (hover to see widget info)';
  pickBtn.style.cssText =
    'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:13px;line-height:1;';
  pickBtn.addEventListener('click', togglePickMode);

  const maximizeBtn = document.createElement('button');
  maximizeBtn.type = 'button';
  maximizeBtn.textContent = '⛶';
  maximizeBtn.title = 'Maximize';
  maximizeBtn.style.cssText =
    'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:13px;line-height:1;';
  maximizeBtn.addEventListener('click', toggleMaximized);

  header.append(title, summary, pickBtn, maximizeBtn, refreshBtn, collapseBtn, closeBtn);
  // ---- end header ----

  // ---- element inspector tooltip ----
  const inspectOverlay = document.createElement('div');
  inspectOverlay.style.cssText =
    'position:fixed;pointer-events:none;z-index:2147483646;border:2px solid #fbbf24;border-radius:4px;display:none;transition:all 60ms ease;';
  document.body.appendChild(inspectOverlay);

  const inspectTooltip = document.createElement('div');
  inspectTooltip.style.cssText =
    'position:fixed;z-index:2147483647;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px 12px;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;display:none;max-width:320px;box-shadow:0 8px 24px rgba(0,0,0,0.5);';
  document.body.appendChild(inspectTooltip);

  let pickMode = false;
  let pickLocked: HTMLElement | null = null;

  function getWidgetInfo(el: HTMLElement): string[] {
    const lines: string[] = [];
    const tag = el.tagName.toLowerCase();
    
    const uxAttrs: string[] = [];
    for (const name of el.getAttributeNames()) {
      if (name.startsWith('ux-')) {
        uxAttrs.push(`${name}="${el.getAttribute(name)}"`);
      }
    }

    const isCustom = tag.includes('-');
    const hasUx = uxAttrs.length > 0;
    if (!isCustom && !hasUx) return [];

    lines.push(`<${tag}>`);
    
    if (el.id) lines.push(`  id="${el.id}"`);
    
    const klass = el.className && typeof el.className === 'string' 
      ? el.className.trim() : '';
    if (klass) {
      const short = klass.length > 80 ? klass.slice(0, 77) + '...' : klass;
      lines.push(`  class="${short}"`);
    }

    for (const attr of uxAttrs) {
      lines.push(`  ${attr}`);
    }

    const app = (window as any).__ux3App;
    if (app?.machines) {
      for (const [name, machine] of Object.entries(app.machines)) {
        try {
          const state = (machine as any).getState?.();
          if (state) lines.push(`  FSM[${name}]: ${state}`);
        } catch { /* ignore */ }
      }
    }

    if (el.shadowRoot) {
      const shadowChildren = el.shadowRoot.children.length;
      lines.push(`  shadow: ${shadowChildren} child(ren)`);
    }

    return lines;
  }

  function breadcrumbChain(el: HTMLElement): string[] {
    const chain: string[] = [];
    let current: HTMLElement | null = el;
    while (current && current !== document.body && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase();
      if (tag.includes('-') || current.hasAttribute('ux-view') || current.hasAttribute('ux-route')) {
        const label = current.getAttribute('ux-label') || 
                       current.getAttribute('ux-view') || 
                       current.id || 
                       tag;
        chain.unshift(label);
      } else if (current.id || current.className) {
        const id = current.id ? `#${current.id}` : '';
        const cls = typeof current.className === 'string' ? `.${current.className.split(' ')[0]}` : '';
        chain.unshift(tag + id + cls);
      }
      current = current.parentElement;
    }
    return chain;
  }

  function updateTitleForSelection(el: HTMLElement | null) {
    if (el) {
      const chain = breadcrumbChain(el);
      const tag = el.tagName.toLowerCase();
      const label = el.getAttribute('ux-label') || el.getAttribute('ux-view') || el.id || tag;
      title.textContent = label;
      title.style.color = '#fbbf24';
      title.title = `Selection: ${chain.join(' > ')}`;
      summary.textContent = chain.join(' › ');
      summary.style.display = 'block';
      summary.style.color = '#94a3b8';
    } else {
      title.textContent = 'UX3 Dev Inspector';
      title.style.color = '#93c5fd';
      title.title = '';
      if (minimized) {
        const tab = TABS.find((t) => t.id === activePanel);
        summary.textContent = tab ? `${tab.label} — Active Route: ${window.location?.pathname || '/'}` : 'Dev Inspector';
        summary.style.display = 'inline';
      } else {
        summary.style.display = 'none';
      }
      summary.style.color = '#94a3b8';
    }
  }

  function togglePickMode() {
    pickMode = !pickMode;
    pickLocked = null;
    pickBtn.style.background = pickMode ? '#1e3a5f' : '#1e293b';
    pickBtn.style.color = pickMode ? '#fbbf24' : '#e2e8f0';
    
    if (!pickMode) {
      inspectOverlay.style.display = 'none';
      inspectTooltip.style.display = 'none';
      document.body.style.cursor = '';
      updateTitleForSelection(null);
    } else {
      document.body.style.cursor = 'crosshair';
    }
  }

  function onInspectMove(event: MouseEvent) {
    if (!pickMode || pickLocked) return;
    const target = event.target as HTMLElement;
    if (!target || target === inspectOverlay || target === inspectTooltip || target.closest('#ux3-devtools-inspector')) {
      inspectOverlay.style.display = 'none';
      inspectTooltip.style.display = 'none';
      return;
    }

    let widgetEl: HTMLElement | null = target;
    while (widgetEl) {
      const info = getWidgetInfo(widgetEl);
      if (info.length > 0) break;
      widgetEl = widgetEl.parentElement;
    }

    if (!widgetEl) {
      inspectOverlay.style.display = 'none';
      inspectTooltip.style.display = 'none';
      return;
    }

    const info = getWidgetInfo(widgetEl);
    const rect = widgetEl.getBoundingClientRect();
    inspectOverlay.style.display = 'block';
    inspectOverlay.style.left = `${rect.left + window.scrollX}px`;
    inspectOverlay.style.top = `${rect.top + window.scrollY}px`;
    inspectOverlay.style.width = `${rect.width}px`;
    inspectOverlay.style.height = `${rect.height}px`;

    inspectTooltip.style.display = 'block';
    const chain = breadcrumbChain(widgetEl);
    const tooltipLines = chain.length ? [`Path: ${chain.join(' › ')}`, ''].concat(info) : info;
    inspectTooltip.innerHTML = tooltipLines.join('<br>').replace(/ /g, '&nbsp;');
    
    let tx = event.clientX + 16;
    let ty = event.clientY - 16;
    const tooltipRect = inspectTooltip.getBoundingClientRect();
    if (tx + tooltipRect.width > window.innerWidth - 8) tx = event.clientX - tooltipRect.width - 16;
    if (ty + tooltipRect.height > window.innerHeight - 8) ty = event.clientY - tooltipRect.height - 16;
    if (ty < 8) ty = 8;
    inspectTooltip.style.left = `${tx}px`;
    inspectTooltip.style.top = `${ty}px`;
  }

  function onInspectClick(event: MouseEvent) {
    if (!pickMode) return;
    const target = event.target as HTMLElement;
    if (!target || target.closest('#ux3-devtools-inspector')) return;
    if (pickLocked) {
      pickLocked = null;
      updateTitleForSelection(null);
      inspectOverlay.style.display = 'none';
      inspectTooltip.style.display = 'none';
      return;
    }
    let widgetEl: HTMLElement | null = target;
    while (widgetEl) {
      if (getWidgetInfo(widgetEl).length > 0) break;
      widgetEl = widgetEl.parentElement;
    }
    if (widgetEl) {
      pickLocked = widgetEl;
      updateTitleForSelection(widgetEl);
      const info = getWidgetInfo(widgetEl);
      inspectTooltip.innerHTML = ['🔒 Locked — click again to release', ''].concat(info).join('<br>').replace(/ /g, '&nbsp;');
    }
  }

  document.addEventListener('mousemove', onInspectMove);
  document.addEventListener('click', onInspectClick);
  disposers.push(() => {
    document.removeEventListener('mousemove', onInspectMove);
    document.removeEventListener('click', onInspectClick);
    inspectOverlay.remove();
    inspectTooltip.remove();
    document.body.style.cursor = '';
  });

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
    'flex:1;overflow:auto;min-height:0;color:var(--ins-text);';
  panelHost.classList.add('ux3-inspector-panel-host');

  const panelStyle = document.createElement('style');
  panelStyle.textContent = `
    .ux3-inspector-panel-host details { color: var(--ins-text); }
    .ux3-inspector-panel-host summary { color: var(--ins-text); cursor: pointer; }
    .ux3-inspector-panel-host input[type="checkbox"],
    .ux3-inspector-panel-host input[type="radio"] { accent-color: var(--ins-accent); }
    .ux3-inspector-panel-host select { background: var(--ins-bg); color: var(--ins-text); border: 1px solid var(--ins-border); }
    .ux3-inspector-panel-host td { color: var(--ins-text); }
    .ux3-inspector-panel-host th { color: var(--ins-text); }
    .ux3-inspector-panel-host label { color: var(--ins-text); }
  `;
  panelHost.appendChild(panelStyle);

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
    const rect = root.getBoundingClientRect();
    const width = rect.width || 480;
    const height = rect.height || 44;
    const maxLeft = Math.max(MARGIN, window.innerWidth - width - MARGIN);
    const maxTop = Math.max(MARGIN, window.innerHeight - height - MARGIN);
    root.style.left = `${Math.min(maxLeft, Math.max(MARGIN, Math.round(left)))}px`;
    root.style.top = `${Math.min(maxTop, Math.max(MARGIN, Math.round(top)))}px`;
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
    if (minimized) {
      const tab = TABS.find((t) => t.id === activePanel);
      summary.textContent = tab ? `${tab.label} — Active Route: ${window.location?.pathname || '/'}` : 'Dev Inspector';
    }
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

  // ---- maximize ----
  let maximized = false;
  let preMaximize: { width: string; height: string; maxHeight: string; left: string; top: string; bottom: string; right: string } | null = null;

  function toggleMaximized() {
    maximized = !maximized;
    maximizeBtn.textContent = maximized ? '🗖' : '⛶';
    maximizeBtn.title = maximized ? 'Restore' : 'Maximize';

    if (maximized) {
      preMaximize = {
        width: root.style.width,
        height: root.style.height,
        maxHeight: root.style.maxHeight,
        left: root.style.left,
        top: root.style.top,
        bottom: root.style.bottom,
        right: root.style.right,
      };
      root.style.width = `calc(100vw - ${MARGIN * 2}px)`;
      root.style.height = `calc(100vh - ${MARGIN * 2}px)`;
      root.style.maxHeight = `calc(100vh - ${MARGIN * 2}px)`;
      root.style.left = `${MARGIN}px`;
      root.style.top = `${MARGIN}px`;
      root.style.right = 'auto';
      root.style.bottom = 'auto';
      root.style.opacity = '1';
      dockTarget = 'custom';
    } else if (preMaximize) {
      root.style.width = preMaximize.width;
      root.style.height = preMaximize.height;
      root.style.maxHeight = preMaximize.maxHeight;
      root.style.left = preMaximize.left;
      root.style.top = preMaximize.top;
      root.style.bottom = preMaximize.bottom;
      root.style.right = preMaximize.right;
      if (minimized) {
        root.style.opacity = '0.5';
      } else {
        root.style.opacity = '1';
      }
      preMaximize = null;
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

    const items: Array<[string, string, string?]> = [
      ['Active Route', typeof window !== 'undefined' ? window.location.pathname : '/', 'routes'],
      ['FSM Machines', String(machines), 'fsm'],
      ['Services', String(services), 'services'],
      ['Routes', String(routes), 'routes'],
      ['Events', String(events), 'events'],
      ['Plugins', String(plugins), 'plugins'],
      ['Active Panel', activePanel],
      ['Inspector Open', devToolsSnapshot?.open ? 'yes' : 'no'],
    ];

    for (const [label, value, targetPanel] of items) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e293b;';
      const l = document.createElement('span');
      l.style.color = '#94a3b8';
      l.textContent = label;
      const v = document.createElement('span');
      v.textContent = value;
      v.style.cssText = 'transition:color 0.12s;';
      const arrow = document.createElement('span');
      arrow.textContent = '→ ';
      arrow.style.cssText = 'color:transparent;transition:color 0.12s;';
      v.prepend(arrow);
      row.append(l, v);

      if (targetPanel) {
        row.style.cursor = 'pointer';
        row.title = `Open ${label} panel`;
        row.setAttribute('tabindex', '0');
        row.setAttribute('role', 'link');
        row.addEventListener('click', () => switchPanel(targetPanel));
        row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') switchPanel(targetPanel); });
        row.addEventListener('mouseenter', () => { row.style.background = '#1e293b'; arrow.style.color = '#fbbf24'; v.style.color = '#fbbf24'; });
        row.addEventListener('mouseleave', () => { row.style.background = ''; arrow.style.color = 'transparent'; v.style.color = ''; });
        row.addEventListener('focus', () => { row.style.background = '#1e293b'; arrow.style.color = '#fbbf24'; v.style.color = '#fbbf24'; });
        row.addEventListener('blur', () => { row.style.background = ''; arrow.style.color = 'transparent'; v.style.color = ''; });
      }

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
    const devToolsSnapshot = devTools?.getSnapshot?.();
    const devToolsPlugin = devToolsSnapshot?.plugins?.find((p: any) => p.name === '@ux3/plugin-dev-tools');
    const devToolsVersion = devToolsPlugin?.version || 'unknown';

    const isDevelopment = !!(config.development && (
      config.development.logging || config.development.hotReload ||
      config.development.inspector || config.development.devTools
    ));

    const activeLocale = ctx.locale?.locale?.primary || '—';
    const supportedLocales = ctx.locale?.supportedLocales?.join(', ') || '—';
    const prefix = ctx.locale?.getRoutePrefix?.() || '';
    const routeMode = (config?.i18n?.routeMode) || (prefix ? 'prefix-optional' : 'no-prefix');
    const localeSource = ctx.locale?.locale?.source || '—';
    const direction = ctx.locale?.locale?.direction || '—';

    const pkgName = config.name || config.site?.name || '—';
    const pkgVersion = config.version || '—';

    const plugins = devToolsSnapshot?.plugins ?? [];
    const activePlugins = Array.isArray(plugins) ? plugins.map((p: any) => p.name || p).join(', ') : '—';

    const machineCount = Object.keys(ctx.machines || {}).length;
    const serviceCount = Object.keys(ctx.services || {}).length;
    const navMode = ctx.nav?.routes?.length ? `${ctx.nav.routes.length} routes` : 'none';

    const sections: Array<[string, string]> = [
      ['— Framework —', ''],
      ['App Name', pkgName],
      ['App Version', pkgVersion],
      ['Dev Tools Version', devToolsVersion],
      ['', ''],
      ['— Locale & Routing —', ''],
      ['Active Locale', activeLocale],
      ['Supported Locales', supportedLocales],
      ['Route Mode', routeMode],
      ['Locale Source', localeSource],
      ['Direction', direction],
      ['Navigation', navMode],
      ['', ''],
      ['— Runtime —', ''],
      ['Development', isDevelopment ? 'yes' : 'no'],
      ['Hot Reload', config.development?.hotReload ? 'yes' : 'no'],
      ['Log Level', config.development?.logging || 'info'],
      ['Inspector', config.development?.inspector ? 'yes' : 'no'],
      ['FSM Machines', `${machineCount}`],
      ['Services', `${serviceCount}`],
      ['', ''],
      ['— Plugins —', ''],
      ['Active Plugins', activePlugins],
    ];

    for (const [label, value] of sections) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e293b;';
      const l = document.createElement('span');
      if (label.startsWith('—') && label.endsWith('—')) {
        l.style.cssText = 'color:#64748b;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;font-size:10px;';
        l.textContent = label.replace(/—/g, '').trim();
        row.style.borderBottom = 'none';
      } else {
        l.style.color = '#94a3b8';
        l.textContent = label;
      }
      const v = document.createElement('span');
      v.textContent = value;
      row.append(l, v);
      if (label !== '') container.appendChild(row);
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
  // Refresh on route changes
  // =========================================================================
  function onRouteChange() {
    if (minimized) return;
    if (activePanel === 'summary') {
      refreshActivePanel();
    } else if (activePanel === 'routes') {
      refreshActivePanel();
    }
  }

  window.addEventListener('popstate', onRouteChange);
  window.addEventListener('ux3:route-change', onRouteChange);
  disposers.push(() => {
    window.removeEventListener('popstate', onRouteChange);
    window.removeEventListener('ux3:route-change', onRouteChange);
  });

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
