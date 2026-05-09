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
    // Restore tab index from FSM context if a fsm-key is set,
    // otherwise from the data-selected-index attribute.
    this.selectedIndex = this.restoreSelectedIndex();
    if (this.selectedIndex > 0 && this.selectedIndex < this.tabs.length) {
      this.selectTab(this.selectedIndex);
    }
    this.addEventListener('click', this.onTabClick);
    this.addEventListener('keydown', this.onTabKeyDown);
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
    const data = this.getAttribute('data-tabs') || '';
    return `tab_${data}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40) || 'tab_default';
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

  /** Walk shadow-DOM host to find the parent view component's FSM. */
  private findParentFsm(): any {
    try {
      const root = this.getRootNode() as ShadowRoot;
      const host = root?.host as any;
      if (host && host.fsm && typeof host.fsm.getContext === 'function') {
        return host.fsm;
      }
    } catch { /* not in a shadow root or no FSM available */ }
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
    this.tabBar.className = 'ux-tab-bar';
    this.tabBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;';
    this.tabBar.setAttribute('role', 'presentation');
    this.prepend(this.tabBar);
  }

  private generateTabsFromData() {
    const data = this.getAttribute('data-tabs');
    if (!data || this.querySelector('[role="tab"], ux-tab')) return;
    const labels = data.split(/[|█,]/).map(s => s.trim()).filter(Boolean);
    labels.forEach((label, i) => {
      const tab = document.createElement('ux-tab');
      tab.textContent = label;
      tab.setAttribute('role', 'tab');
      if (i === 0) tab.setAttribute('selected', '');
      if (this.tabBar) {
        this.tabBar.appendChild(tab);
      } else {
        this.appendChild(tab);
      }
    });
  }

  private applyTabStyles() {
    const tabCls = resolveStyle('tab') || resolveStyle('tabs');
    const panelCls = resolveStyle('tab-panel');
    const selCls = resolveStyle('tab-selected');
    if (tabCls && selCls) {
      this.tabs.forEach((t, i) => {
        const existing = t.className.split(/\s+/).filter(Boolean);
        const base = new Set([...existing, ...tabCls.split(/\s+/).filter(Boolean)]);
        if (t.hasAttribute('selected')) {
          for (const c of selCls.split(/\s+/).filter(Boolean)) base.add(c);
        }
        t.className = Array.from(base).join(' ');
      });
    }
    if (panelCls) {
      this.panels.forEach(p => {
        if (!p.className) p.className = panelCls;
      });
    }
  }

  private collectChildren() {
    this.tabs = Array.from(this.querySelectorAll('[role="tab"], ux-tab, [ux-role="tab"]'));
    this.panels = Array.from(this.querySelectorAll(':scope > [role="tabpanel"], :scope > ux-tab-panel'));
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
        detail: { selectedIndex: idx, selectedLabel: tab.textContent?.trim() || '' },
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
      selectedLabel: this.tabs[index]?.textContent?.trim() || '',
    };
    this.dispatchEvent(new CustomEvent('ux:event', {
      bubbles: true, composed: true,
      detail: { action, payload },
    }));
  }

  private selectTab(index: number) {
    this.selectedIndex = index;
    const selCls = resolveStyle('tab-selected');
    this.tabs.forEach((t, i) => {
      if (i === index) {
        t.setAttribute('aria-selected', 'true');
        t.setAttribute('selected', '');
        t.setAttribute('tabindex', '0');
        if (selCls) {
          const existing = t.className.split(/\s+/).filter(Boolean);
          const merged = new Set([...existing, ...selCls.split(/\s+/).filter(Boolean)]);
          t.className = Array.from(merged).join(' ');
        }
      } else {
        t.setAttribute('aria-selected', 'false');
        t.removeAttribute('selected');
        t.setAttribute('tabindex', '-1');
        if (selCls) t.classList.remove(...selCls.split(/\s+/).filter(Boolean));
      }
    });
    this.panels.forEach((p, i) => {
      p.style.display = i === index ? '' : 'none';
    });
  }
}
