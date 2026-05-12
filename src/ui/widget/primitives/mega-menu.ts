import { UxBase } from './base.js';

const STYLE = `
  :host { display: block; }
  .mm-top { display: flex; flex-wrap: wrap; gap: 0; list-style: none; margin: 0; padding: 0; }
  .mm-item { position: relative; }
  .mm-link {
    display: block; padding: 0.5rem 0.75rem; text-decoration: none;
    color: inherit; white-space: nowrap; transition: background 0.15s;
  }
  .mm-toggle {
    display: inline-flex; align-items: center; justify-content: center;
    width: 1.75rem; height: 1.75rem; margin-left: 0.25rem; border: none;
    background: transparent; color: inherit; cursor: pointer;
  }
  .mm-link:hover { background: var(--color-bg-muted, #f1f5f9); }
  .mm-link.active { font-weight: 600; }
  .mm-drop {
    display: none; position: absolute; top: 100%; left: 0; z-index: 50;
    min-width: 12rem; border-radius: 0.375rem;
    border: 1px solid var(--color-border, #e2e8f0);
    background: var(--color-bg, #fff);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 0.25rem 0;
  }
  .mm-item:hover > .mm-drop,
  .mm-item.expanded > .mm-drop { display: block; }
  .mm-sub { list-style: none; margin: 0; padding: 0; }
  .mm-sub .mm-link { font-size: 0.875rem; padding: 0.375rem 1rem; }
`;

export class UxMegaMenu extends UxBase {
  private _styleEl: HTMLStyleElement | null = null;

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'navigation');
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = STYLE;
    this.appendChild(this._styleEl);
    window.addEventListener('popstate', () => this.render());
    window.addEventListener('ux3:navigate', () => this.render());
    window.addEventListener('ux:locale-change', () => this.render());
  }

  protected applyData(_data: any): void {
    this.render();
  }

  private render(): void {
    const nav = (window as any).__ux3App?.nav;
    const routes = nav?.routes;
    if (!routes?.length) return;

    while (this.lastChild && this.lastChild !== this._styleEl) {
      this.removeChild(this.lastChild);
    }

    const ul = document.createElement('ul');
    ul.className = 'mm-top';
    for (const route of routes) {
      ul.appendChild(this.buildItem(route, nav, false));
    }
    this.appendChild(ul);
  }

  private buildItem(route: any, nav: any, sub: boolean): HTMLElement {
    const li = document.createElement('li');
    li.className = 'mm-item';

    const label = nav?.getLabel ? nav.getLabel(route) : (route.label || route.path || '');
    const hasKids = route.children?.length > 0;

    if (route.path && route.path !== '*') {
      const a = document.createElement('a');
      a.href = route.path;
      a.textContent = label;
      a.className = 'mm-link';
      if (this.isActive(route.path)) a.classList.add('active');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.pushState({}, '', route.path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      li.appendChild(a);
    } else {
      const span = document.createElement('span');
      span.textContent = label;
      span.className = 'mm-link';
      li.appendChild(span);
    }

    if (hasKids) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'mm-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Toggle submenu');
      toggle.textContent = '▾';
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const expanded = li.classList.toggle('expanded');
        toggle.setAttribute('aria-expanded', String(expanded));
      });
      li.appendChild(toggle);

      const drop = document.createElement('div');
      drop.className = 'mm-drop';
      const subUl = document.createElement('ul');
      subUl.className = sub ? 'mm-sub' : 'mm-sub';
      for (const child of route.children) {
        subUl.appendChild(this.buildItem(child, nav, true));
      }
      drop.appendChild(subUl);
      li.appendChild(drop);
    }

    return li;
  }

  private isActive(routePath: string): boolean {
    const current = (window as any).__ux3RoutePath || window.location.pathname;
    if (routePath === '/') return current === '/' || current === '';
    return current === routePath || current.startsWith(routePath + '/');
  }
}
