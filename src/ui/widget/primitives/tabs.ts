import { UxBase } from './base.js';
import { resolveStyle } from '../../style-registry.js';

export class UxTabs extends UxBase {
  private tabs: HTMLElement[] = [];
  private panels: HTMLElement[] = [];
  private tabBar: HTMLElement | null = null;
  private selectedIndex = 0;

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'tablist');
    this.buildTabBar();
    this.generateTabsFromData();
    this.collectChildren();
    this.applyTabStyles();
    const synced = this.syncFromFsmState();
    if (!synced) {
      this.selectedIndex = this.restoreSelectedIndex();
      if (this.selectedIndex > 0 && this.selectedIndex < this.tabs.length) {
        this.selectTab(this.selectedIndex);
      }
    }
    this.addEventListener('click', this.onTabClick);
    this.addEventListener('keydown', this.onTabKeyDown);
  }

  private syncFromFsmState(): boolean {
    const fsm = this.findParentFsm();
    if (!fsm) return false;
    const state = fsm.getState?.() || '';
    const leaf = state.split('.').pop() || '';
    if (!leaf) return false;
    for (let i = 0; i < this.panels.length; i++) {
      const pState = this.panels[i].getAttribute('state');
      if (pState === leaf) {
        this.selectTab(i);
        return true;
      }
    }
    return false;
  }

  /**
   * Derive a stable FSM context key so the selected index survives DOM
   * replacement (e.g. locale-change re-renders).  Precedence:
   *   1. explicit data-fsm-key attribute
   *   2. derived from data-tabs (hash of the label string)
   */
  private fsmKey(): string {
    const attr = this.getAttribute('data-fsm-key');
    if (attr) return attr;
    const data = this.getAttribute('data-tabs');
    if (data) {
      return `tab_${data}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40);
    }
    const panels = this.querySelectorAll('ux-tab');
    if (panels.length > 0) {
      const labelHash = Array.from(panels)
        .map(p => p.getAttribute('label') || '')
        .filter(Boolean)
        .join('_');
      return `tab_${labelHash}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40) || 'tab_default';
    }
    return 'tab_default';
  }

  /**
   * Restore the selected tab index from the parent FSM context.
   */
  private restoreSelectedIndex(): number {
    const key = this.fsmKey();
    const fsm = this.findParentFsm();
    if (fsm) {
      const ctx = fsm.getContext();
      if (ctx && typeof ctx[key] === 'number') {
        return ctx[key];
      }
    }
    return 0;
  }

  /** Walk up the DOM to find the nearest parent with an FSM. */
  private findParentFsm(): any {
    let el: HTMLElement | null = this;
    while (el) {
      if ((el as any).fsm && typeof (el as any).fsm.getContext === 'function') {
        return (el as any).fsm;
      }
      el = el.parentElement || (el.getRootNode() as ShadowRoot)?.host as HTMLElement || null;
    }
    return null;
  }

  /** Persist the selected index to the FSM context so it survives re-renders. */
  private persistSelectedIndex(index: number): void {
    const key = this.fsmKey();
    const fsm = this.findParentFsm();
    if (fsm) {
      const ctx = fsm.getContext();
      ctx[key] = index;
    }
  }

  protected onDisconnected(): void {
    this.removeEventListener('click', this.onTabClick);
    this.removeEventListener('keydown', this.onTabKeyDown);
    super.onDisconnected();
  }

  private buildTabBar() {
    this.tabBar = document.createElement('div');
    this.tabBar.className = resolveStyle('ux-tab-bar');
    this.tabBar.setAttribute('role', 'presentation');
    this.prepend(this.tabBar);
  }

  private generateTabsFromData() {
    if (this.querySelector('[role="tab"]')) return;

    const data = this.getAttribute('data-tabs');
    let labels: string[] = [];

    if (data) {
      labels = data.split(/[|█,]/).map(s => s.trim()).filter(Boolean);
    } else {
      const panels = this.querySelectorAll('ux-tab');
      if (panels.length === 0) return;
      labels = Array.from(panels)
        .map(p => p.getAttribute('label') || '')
        .filter(Boolean);
      if (labels.length === 0) return;
    }

    labels.forEach((label, i) => {
      const tab = document.createElement('ux-tab');
      tab.textContent = label;
      tab.setAttribute('role', 'tab');
      tab.className = resolveStyle('ux-tab-btn');
      if (i === 0) { tab.setAttribute('selected', ''); this.applySelectedCls(tab); }
      if (this.tabBar) {
        this.tabBar.appendChild(tab);
      } else {
        this.appendChild(tab);
      }
    });
  }

  private applySelectedCls(tab: HTMLElement) {
    const extra = resolveStyle('ux-tab-btn-selected').split(/\s+/).filter(Boolean);
    if (extra.length) {
      const merged = Array.from(new Set([...tab.className.split(/\s+/).filter(Boolean), ...extra]));
      tab.className = merged.join(' ');
    }
  }

  private removeSelectedCls(tab: HTMLElement) {
    const extra = resolveStyle('ux-tab-btn-selected').split(/\s+/).filter(Boolean);
    if (extra.length) {
      tab.className = tab.className.split(/\s+/).filter(c => !extra.includes(c)).join(' ');
    }
  }

  private applyTabStyles() {
    const panelCls = resolveStyle('ux-tab-panel') || resolveStyle('ux-tab');
    if (panelCls) {
      this.panels.forEach(p => {
        if (!p.className) p.className = panelCls;
      });
    }
  }

  private collectChildren() {
    this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
    this.panels = Array.from(this.querySelectorAll(':scope > ux-tab, :scope > [role="tabpanel"]'));
    if (this.tabs.length > 0 && !this.tabs.find((t) => t.getAttribute('aria-selected') === 'true')) {
      this.selectTab(0);
    }
  }

  private readonly onTabClick = (e: Event) => {
    const tab = (e.target as HTMLElement).closest('[role="tab"], ux-tab') as HTMLElement;
    if (!tab) return;
    const idx = this.tabs.indexOf(tab);
    if (idx >= 0) {
      this.selectTab(idx);
      this.persistSelectedIndex(idx);
      this.dispatchEvent(new CustomEvent('ux:change', {
        bubbles: true, composed: true,
        detail: { selectedIndex: idx, selectedLabel: this.tabs[idx]?.getAttribute('label') || `Tab ${idx + 1}` },
      }));
      this.dispatchFsmEvent(idx);
    }
  };

  private readonly onTabKeyDown = (e: KeyboardEvent) => {
    const current = this.tabs.findIndex((t) => t.matches(':focus, :focus-within'));
    let next = current;
    if (e.key === 'ArrowRight') next = (current + 1) % this.tabs.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + this.tabs.length) % this.tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = this.tabs.length - 1;
    else return;
    e.preventDefault();
    this.selectTab(next);
    this.persistSelectedIndex(next);
    this.tabs[next]?.focus();
    this.dispatchFsmEvent(next);
  };

  private dispatchFsmEvent(index: number) {
    const uxEvent = this.getAttribute('ux-event');
    if (!uxEvent) return;
    const colonIdx = uxEvent.indexOf(':');
    if (colonIdx < 0) return;
    const action = uxEvent.slice(colonIdx + 1).trim();
    if (!action) return;
    const payload: Record<string, unknown> = {
      selectedIndex: index,
      selectedLabel: this.tabs[index]?.getAttribute('label') || `Tab ${index + 1}`,
    };
    this.dispatchEvent(new CustomEvent('ux:event', {
      bubbles: true, composed: true,
      detail: { action, payload },
    }));
  }

  private selectTab(index: number) {
    this.selectedIndex = index;
    this.tabs.forEach((t, i) => {
      if (i === index) {
        t.setAttribute('aria-selected', 'true');
        t.setAttribute('selected', '');
        t.setAttribute('tabindex', '0');
        this.applySelectedCls(t);
      } else {
        t.setAttribute('aria-selected', 'false');
        t.removeAttribute('selected');
        t.setAttribute('tabindex', '-1');
        this.removeSelectedCls(t);
      }
    });
    this.panels.forEach((p, i) => {
      p.style.display = i === index ? '' : 'none';
    });
  }
}
