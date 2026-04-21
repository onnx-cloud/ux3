/**
 * UX3 Inspector Widget — uplifted shell with Shadow DOM, drag, resize, dock,
 * window-state machine, tabbed panels, and sessionStorage persistence.
 *
 * Zero external dependencies. Pure Web Component.
 * Tree-shaken when development.inspector is false.
 */

import type { AppContext } from './app.js';
import { inspectorBus } from './inspector/event-bus.js';
import { onBadgeUpdate } from './inspector/panels/validation-panel.js';

// window augmentation (set by context-builder)
declare global {
  interface Window {
    __ux3Inspector?: AppContext;
    __pluginInspector?: Array<{ name: string; version?: string; hooks?: string[]; status?: string }>;
  }
}

// ─────────────────────────── Types ───────────────────────────

type WindowState = 'floating' | 'docked-top' | 'docked-right' | 'docked-bottom' | 'docked-left' | 'minimized' | 'maximized' | 'iconified';

interface PersistedState {
  x: number;
  y: number;
  w: number;
  h: number;
  windowState: WindowState;
  dockEdge: string | null;
  activeTab: number;
}

interface TabDef {
  label: string;
  icon: string;
  render: () => Promise<HTMLElement>;
}

const STORAGE_KEY = '__ux3i';
const SNAP_ZONE = 48;
const MIN_W = 280;
const MIN_H = 200;
const DEFAULT_W = 420;
const DEFAULT_H = () => Math.round(window.innerHeight * 0.55);

// ─────────────────────────── CSS ───────────────────────────

const STYLES = `
  :host {
    --ins-bg: #1a1a2e;
    --ins-header: #16213e;
    --ins-accent: #0f3460;
    --ins-text: #e0e0e0;
    --ins-border: #2a2a4e;
    --ins-flash: #ffd700;
    --ins-z: 2147483647;
    all: initial;
    display: block;
    position: fixed;
    z-index: var(--ins-z);
    font-family: system-ui, monospace;
    font-size: 12px;
    color: var(--ins-text);
    box-sizing: border-box;
  }

  * { box-sizing: border-box; }

  #shell {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: var(--ins-bg);
    border: 1px solid var(--ins-border);
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.6);
  }

  :host([data-wstate="minimized"]) #shell { border-radius: 4px; }
  :host([data-wstate="maximized"]) #shell { border-radius: 0; }
  :host([data-wstate="iconified"]) #shell {
    border-radius: 50%;
    cursor: pointer;
    align-items: center;
    justify-content: center;
  }
  :host([data-wstate="iconified"]) #tabs,
  :host([data-wstate="iconified"]) #panel-host,
  :host([data-wstate="iconified"]) #resize-se,
  :host([data-wstate="iconified"]) #resize-row { display: none; }

  /* header */
  #header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 6px;
    height: 32px;
    background: var(--ins-header);
    cursor: move;
    user-select: none;
    flex-shrink: 0;
  }
  :host([data-wstate="iconified"]) #header { cursor: pointer; border-radius: 50%; height: 100%; }

  #title {
    font-weight: bold;
    font-size: 11px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hbtn {
    background: none;
    border: none;
    color: var(--ins-text);
    cursor: pointer;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 13px;
    line-height: 1;
    opacity: 0.7;
  }
  .hbtn:hover { opacity: 1; background: rgba(255,255,255,0.1); }

  /* tabs */
  #tabs {
    display: flex;
    overflow-x: auto;
    background: var(--ins-accent);
    flex-shrink: 0;
    scrollbar-width: thin;
  }
  :host([data-wstate="minimized"]) #tabs { display: none; }

  .tab {
    padding: 4px 10px;
    cursor: pointer;
    white-space: nowrap;
    font-size: 11px;
    opacity: 0.65;
    border-bottom: 2px solid transparent;
    transition: opacity 0.15s, border-color 0.15s;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    color: var(--ins-text);
  }
  .tab:hover { opacity: 0.9; }
  .tab.active { opacity: 1; border-bottom-color: var(--ins-flash); }
  .tab-badge {
    display: inline-block;
    background: #f44;
    color: #fff;
    border-radius: 8px;
    font-size: 9px;
    padding: 0 4px;
    margin-left: 3px;
    vertical-align: super;
  }

  /* panel */
  #panel-host {
    flex: 1;
    overflow: hidden;
    position: relative;
  }
  :host([data-wstate="minimized"]) #panel-host { display: none; }

  .panel-slot {
    position: absolute;
    inset: 0;
    overflow: auto;
    display: none;
  }
  .panel-slot.active { display: block; }

  /* resize handles */
  #resize-row {
    display: flex;
    height: 8px;
    flex-shrink: 0;
  }
  :host([data-wstate="minimized"]) #resize-row,
  :host([data-wstate="maximized"]) #resize-row,
  :host([data-wstate^="docked"]) #resize-row { display: none; }

  .rh {
    flex: 1;
    cursor: ns-resize;
  }
  #resize-se {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
    opacity: 0.4;
  }
  #resize-se::after {
    content: '';
    display: block;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 0 10px 10px;
    border-color: transparent transparent var(--ins-border) transparent;
    position: absolute;
    bottom: 2px;
    right: 2px;
  }

  /* validation error badge in title bar */
  #err-badge {
    display: none;
    background: #f44;
    color: #fff;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    font-size: 9px;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    flex-shrink: 0;
  }
  #err-badge.show { display: flex; }

  /* docked states */
  :host([data-wstate="docked-top"]) { top: 0 !important; left: 0 !important; right: 0 !important; bottom: auto !important; width: 100% !important; }
  :host([data-wstate="docked-right"]) { top: 0 !important; right: 0 !important; left: auto !important; bottom: 0 !important; height: 100% !important; }
  :host([data-wstate="docked-bottom"]) { left: 0 !important; right: 0 !important; bottom: 0 !important; top: auto !important; width: 100% !important; }
  :host([data-wstate="docked-left"]) { top: 0 !important; left: 0 !important; bottom: 0 !important; right: auto !important; height: 100% !important; }
`;

// ─────────────────────────── Widget ───────────────────────────

export default class InspectorWidget extends HTMLElement {
  private ctx: AppContext | null = null;
  private state: PersistedState = {
    x: 0,
    y: 0,
    w: DEFAULT_W,
    h: 0,
    windowState: 'floating',
    dockEdge: null,
    activeTab: 0,
  };

  private tabs: TabDef[] = [];
  private panelSlots: (HTMLElement | null)[] = [];
  private tabEls: HTMLElement[] = [];
  private validationBadgeEl: HTMLElement | null = null;
  private errBadgeEl: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.ctx = (window as any).__ux3Inspector ?? null;
    if (!this.ctx) return;

    // Set defaults that depend on window size (not available at field-init time)
    this.state.h = DEFAULT_H();
    this.state.x = window.innerWidth - DEFAULT_W - 16;
    this.state.y = window.innerHeight - this.state.h - 16;

    this.loadPersistedState();
    this.buildShell();
    this.applyWindowState();

    document.addEventListener('keydown', this.onKeyDown);
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
    if (e.key === 'Escape') this.setWindowState('iconified');
    if (e.key === 'F2') {
      this.setWindowState(this.state.windowState === 'maximized' ? 'floating' : 'maximized');
    }
  };

  // ─── Persistence ───────────────────────────

  private loadPersistedState(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        this.state = { ...this.state, ...parsed };
      }
    } catch { /* ignore */ }
  }

  private saveState(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch { /* ignore */ }
  }

  // ─── Build DOM ─────────────────────────────

  private buildShell(): void {
    const sr = this.shadowRoot!;
    sr.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = STYLES;
    sr.appendChild(style);

    const shell = document.createElement('div');
    shell.id = 'shell';
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-label', 'UX3 Inspector');

    // Header
    const header = document.createElement('div');
    header.id = 'header';

    const title = document.createElement('span');
    title.id = 'title';
    title.textContent = 'UX3 Inspector';

    this.errBadgeEl = document.createElement('span');
    this.errBadgeEl.id = 'err-badge';
    this.errBadgeEl.title = 'Validation errors';

    const btnMin = this.makeHBtn('─', 'Minimize', () => this.setWindowState('minimized'));
    const btnMax = this.makeHBtn('□', 'Maximize / Restore', () =>
      this.setWindowState(this.state.windowState === 'maximized' ? 'floating' : 'maximized')
    );
    const btnIconify = this.makeHBtn('✕', 'Iconify', () => this.setWindowState('iconified'));

    header.appendChild(title);
    header.appendChild(this.errBadgeEl);
    header.appendChild(btnMin);
    header.appendChild(btnMax);
    header.appendChild(btnIconify);
    shell.appendChild(header);

    // Tabs bar
    const tabBar = document.createElement('div');
    tabBar.id = 'tabs';
    tabBar.setAttribute('role', 'tablist');
    shell.appendChild(tabBar);

    // Panel host
    const panelHost = document.createElement('div');
    panelHost.id = 'panel-host';
    shell.appendChild(panelHost);

    // Resize row (bottom-edge grab)
    const resizeRow = document.createElement('div');
    resizeRow.id = 'resize-row';
    const rhEl = document.createElement('div');
    rhEl.className = 'rh';
    resizeRow.appendChild(rhEl);
    shell.appendChild(resizeRow);

    // SE corner resize
    const resizeSE = document.createElement('div');
    resizeSE.id = 'resize-se';
    shell.appendChild(resizeSE);

    sr.appendChild(shell);

    // Build tabs registry
    this.tabs = this.buildTabDefs();
    this.panelSlots = new Array(this.tabs.length).fill(null);
    this.tabEls = [];

    this.tabs.forEach((tab, i) => {
      const btn = document.createElement('button');
      btn.className = 'tab' + (i === this.state.activeTab ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(i === this.state.activeTab));
      btn.setAttribute('tabindex', i === this.state.activeTab ? '0' : '-1');
      btn.dataset.tabIndex = String(i);

      const iconSpan = document.createElement('span');
      iconSpan.textContent = tab.icon + ' ';
      const labelSpan = document.createElement('span');
      labelSpan.textContent = tab.label;
      btn.appendChild(iconSpan);
      btn.appendChild(labelSpan);

      // Validation tab badge (index 9)
      if (i === 9) {
        this.validationBadgeEl = document.createElement('span');
        this.validationBadgeEl.className = 'tab-badge';
        this.validationBadgeEl.style.display = 'none';
        btn.appendChild(this.validationBadgeEl);
      }

      btn.addEventListener('click', () => this.activateTab(i));
      btn.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') this.activateTab((i + 1) % this.tabs.length);
        if (e.key === 'ArrowLeft') this.activateTab((i - 1 + this.tabs.length) % this.tabs.length);
      });

      tabBar.appendChild(btn);
      this.tabEls.push(btn);

      const slot = document.createElement('div');
      slot.className = 'panel-slot' + (i === this.state.activeTab ? ' active' : '');
      slot.setAttribute('role', 'tabpanel');
      panelHost.appendChild(slot);
    });

    // Eagerly render the initially active tab
    this.renderPanel(this.state.activeTab);

    this.wireHeaderDrag(header);
    this.wireResize(rhEl, 's');
    this.wireResize(resizeSE, 'se');

    // Iconified → click header to restore
    header.addEventListener('click', () => {
      if (this.state.windowState === 'iconified') this.setWindowState('floating');
    });

    // Validation badge callback
    onBadgeUpdate((count) => {
      if (!this.validationBadgeEl || !this.errBadgeEl) return;
      if (count > 0) {
        this.validationBadgeEl.textContent = String(count);
        this.validationBadgeEl.style.display = '';
        this.errBadgeEl.textContent = String(count);
        this.errBadgeEl.classList.add('show');
      } else {
        this.validationBadgeEl.style.display = 'none';
        this.errBadgeEl.classList.remove('show');
      }
    });

    this.hookLogger();
  }

  private makeHBtn(text: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'hbtn';
    btn.textContent = text;
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private buildTabDefs(): TabDef[] {
    const ctx = this.ctx!;
    return [
      {
        label: 'FSM', icon: '⟳',
        render: async () => { const { createFsmPanel } = await import('./inspector/panels/fsm-panel.js'); return createFsmPanel(ctx); },
      },
      {
        label: 'Context', icon: '{}',
        render: async () => { const { createContextPanel } = await import('./inspector/panels/context-panel.js'); return createContextPanel(ctx); },
      },
      {
        label: 'i18n', icon: '🌐',
        render: async () => { const { createI18nPanel } = await import('./inspector/panels/i18n-panel.js'); return createI18nPanel(ctx); },
      },
      {
        label: 'Routes', icon: '↗',
        render: async () => { const { createRoutesPanel } = await import('./inspector/panels/routes-panel.js'); return createRoutesPanel(ctx); },
      },
      {
        label: 'Services', icon: '⚡',
        render: async () => { const { createServicesPanel } = await import('./inspector/panels/services-panel.js'); return createServicesPanel(ctx); },
      },
      {
        label: 'Styles', icon: '🎨',
        render: async () => { const { createStylesPanel } = await import('./inspector/panels/styles-panel.js'); return createStylesPanel(ctx); },
      },
      {
        label: 'Logic', icon: '𝑓',
        render: async () => { const { createLogicPanel } = await import('./inspector/panels/logic-panel.js'); return createLogicPanel(ctx); },
      },
      {
        label: 'Plugins', icon: '🧩',
        render: async () => { const { createPluginsPanel } = await import('./inspector/panels/plugins-panel.js'); return createPluginsPanel(); },
      },
      {
        label: 'Events', icon: '📋',
        render: async () => { const { createEventsPanel } = await import('./inspector/panels/events-panel.js'); return createEventsPanel(); },
      },
      {
        label: 'Validation', icon: '✅',
        render: async () => { const { createValidationPanel } = await import('./inspector/panels/validation-panel.js'); return createValidationPanel(); },
      },
    ];
  }

  private renderPanel(index: number): void {
    const sr = this.shadowRoot!;
    const slots = sr.querySelectorAll<HTMLElement>('.panel-slot');
    const slot = slots[index];
    if (!slot || this.panelSlots[index]) return;

    this.tabs[index].render()
      .then(el => {
        slot.appendChild(el);
        this.panelSlots[index] = el;
      })
      .catch(() => {
        slot.textContent = 'Panel failed to load.';
      });
  }

  private activateTab(index: number): void {
    const sr = this.shadowRoot!;
    const slots = sr.querySelectorAll<HTMLElement>('.panel-slot');

    this.tabEls.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
      btn.setAttribute('aria-selected', String(i === index));
      btn.setAttribute('tabindex', i === index ? '0' : '-1');
    });
    slots.forEach((slot, i) => slot.classList.toggle('active', i === index));

    this.state.activeTab = index;
    this.renderPanel(index);
    this.saveState();
  }

  // ─── Window state machine ──────────────────

  private setWindowState(ws: WindowState): void {
    this.state.windowState = ws;

    if (ws === 'iconified') {
      this.style.cssText = `position:fixed;bottom:1rem;right:1rem;width:40px;height:40px;`;
    } else if (ws === 'maximized') {
      this.style.cssText = `position:fixed;inset:0;width:100%;height:100%;`;
    } else if (ws === 'minimized') {
      this.style.cssText = `position:fixed;left:${this.state.x}px;top:${this.state.y}px;width:${this.state.w}px;height:2rem;`;
    } else if (ws.startsWith('docked-')) {
      this.style.cssText = '';
      this.style.setProperty('--ins-w', this.state.w + 'px');
      this.style.setProperty('--ins-h', this.state.h + 'px');
      this.state.dockEdge = ws.replace('docked-', '');
    } else {
      // floating
      this.style.cssText = `position:fixed;left:${this.state.x}px;top:${this.state.y}px;width:${this.state.w}px;height:${this.state.h}px;`;
      this.state.dockEdge = null;
    }

    this.setAttribute('data-wstate', ws);
    this.saveState();
  }

  private applyWindowState(): void {
    this.setWindowState(this.state.windowState);
  }

  // ─── Drag ──────────────────────────────────

  private wireHeaderDrag(header: HTMLElement): void {
    let startX = 0, startY = 0, origX = 0, origY = 0, dragging = false;

    header.addEventListener('pointerdown', (e: PointerEvent) => {
      const ws = this.state.windowState;
      if (ws === 'maximized' || ws === 'iconified') return;
      if ((e.target as HTMLElement).closest?.('button')) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = this.state.x;
      origY = this.state.y;
      header.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    header.addEventListener('pointermove', (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const newX = Math.max(0, Math.min(vw - this.state.w, origX + dx));
      const newY = Math.max(0, Math.min(vh - 40, origY + dy));
      this.state.x = newX;
      this.state.y = newY;

      // Un-dock if dragging away
      if (this.state.windowState.startsWith('docked')) {
        this.state.windowState = 'floating';
        this.setAttribute('data-wstate', 'floating');
        this.style.cssText = `position:fixed;left:${newX}px;top:${newY}px;width:${this.state.w}px;height:${this.state.h}px;`;
      } else {
        this.style.left = newX + 'px';
        this.style.top = newY + 'px';
      }
    });

    header.addEventListener('pointerup', (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      header.releasePointerCapture(e.pointerId);
      this.checkDockSnap(e.clientX, e.clientY);
      this.saveState();
    });
  }

  private checkDockSnap(cx: number, cy: number): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (cy <= SNAP_ZONE) return this.setWindowState('docked-top');
    if (cx >= vw - SNAP_ZONE) return this.setWindowState('docked-right');
    if (cy >= vh - SNAP_ZONE) return this.setWindowState('docked-bottom');
    if (cx <= SNAP_ZONE) return this.setWindowState('docked-left');
  }

  // ─── Resize ────────────────────────────────

  private wireResize(handle: HTMLElement, dir: 's' | 'se'): void {
    let startX = 0, startY = 0, origW = 0, origH = 0, resizing = false;

    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      if (this.state.windowState !== 'floating') return;
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      origW = this.state.w;
      origH = this.state.h;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    });

    handle.addEventListener('pointermove', (e: PointerEvent) => {
      if (!resizing) return;
      const dy = e.clientY - startY;
      const dx = e.clientX - startX;
      if (dir === 's' || dir === 'se') {
        this.state.h = Math.max(MIN_H, origH + dy);
        this.style.height = this.state.h + 'px';
      }
      if (dir === 'se') {
        this.state.w = Math.max(MIN_W, origW + dx);
        this.style.width = this.state.w + 'px';
      }
    });

    handle.addEventListener('pointerup', (e: PointerEvent) => {
      if (!resizing) return;
      resizing = false;
      handle.releasePointerCapture(e.pointerId);
      this.saveState();
    });
  }

  // ─── Logger hook ──────────────────────────

  private hookLogger(): void {
    const logger = this.ctx?.logger;
    if (!logger || typeof (logger as any).subscribe !== 'function') return;
    (logger as any).subscribe((entry: any) => {
      inspectorBus.emit('logger', entry.level ?? 'info', { message: entry.message, data: entry.data });
    });
  }
}

// Register custom element
if (typeof customElements !== 'undefined' && !customElements.get('ux3-inspector')) {
  customElements.define('ux3-inspector', InspectorWidget);
}
