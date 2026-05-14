import { UxBase } from './base.js';
import { registerLightStyle, registerStyles } from '../../style-registry.js';

const STYLE_ID = 'ux-mega-menu-style';
const STYLE_CSS = `
  ux-mega-menu { display: flex; }
  ux-mega-menu > ul {
    display: flex; list-style: none; margin: 0; padding: 0;
    align-items: center; height: 100%; gap: 0;
  }
  ux-mega-menu > ul > li {
    position: relative; display: flex; align-items: center;
  }
  ux-mega-menu .mm-link {
    display: inline-flex; align-items: center; gap: 0.25rem;
    padding: 0.5rem 0.75rem; font-size: 0.875rem; font-weight: 500;
    color: var(--color-text-muted, #6b7280); text-decoration: none;
    border-radius: 0.375rem; cursor: pointer; white-space: nowrap;
    transition: color 150ms ease; border: none; background: none; font-family: inherit;
  }
  ux-mega-menu .mm-link:hover {
    color: var(--color-text, #0f172a);
  }
  ux-mega-menu .mm-link.mm-active {
    color: var(--color-text-muted, #9ca3af);
  }
  ux-mega-menu .mm-arrow {
    display: inline-block; font-size: 0.625rem; transition: transform 200ms ease;
    line-height: 1;
  }
  ux-mega-menu li.mm-open > .mm-link .mm-arrow {
    transform: rotate(180deg);
  }
  ux-mega-menu .mm-drop {
    display: none; position: absolute; top: 100%; left: 0; min-width: 180px;
    background: var(--color-bg, #fff); border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 0.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    z-index: 1000; padding: 0.375rem 0;
  }
  ux-mega-menu li.mm-open > .mm-drop {
    display: block;
  }
  ux-mega-menu .mm-sub {
    list-style: none; margin: 0; padding: 0;
  }
  ux-mega-menu .mm-sub .mm-link {
    display: block; padding: 0.5rem 1rem; border-radius: 0;
    font-weight: 400;
  }
  ux-mega-menu .mm-sub .mm-link:hover {
    background: var(--color-bg-muted, #f3f4f6);
  }
  ux-mega-menu .mm-sub li {
    display: block;
  }
`;

registerLightStyle(STYLE_ID, STYLE_CSS);

registerStyles({
  'ux-mega-menu-top': '',
  'ux-mega-menu-item': '',
  'ux-mega-menu-link': 'mm-link',
  'ux-mega-menu-link-active': 'mm-active',
  'ux-mega-menu-toggle': 'mm-link',
  'ux-mega-menu-drop': 'mm-drop',
  'ux-mega-menu-sub': 'mm-sub',
});

export class UxMegaMenu extends UxBase {
  private closeTimers: Map<HTMLElement, ReturnType<typeof setTimeout>> = new Map();

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'navigation');
    window.addEventListener('popstate', this._onRoute);
    window.addEventListener('ux:app.route.navigate', this._onRoute);
    window.addEventListener('ux:i18n.locale.change', this._onLocale);
    this.render();
  }

  protected onDisconnected(): void {
    window.removeEventListener('popstate', this._onRoute);
    window.removeEventListener('ux:app.route.navigate', this._onRoute);
    window.removeEventListener('ux:i18n.locale.change', this._onLocale);
    for (const timer of this.closeTimers.values()) {
      clearTimeout(timer);
    }
    this.closeTimers.clear();
    super.onDisconnected();
  }

  private readonly _onRoute = (): void => { this.render(); };
  private readonly _onLocale = (): void => { this.render(); };

  protected applyData(_data: any): void {
    this.render();
  }

  private render(): void {
    const nav = (window as any).__ux3App?.nav;
    const routes = nav?.tree ? Object.values(nav.tree) : nav?.routes;
    if (!routes?.length) return;

    while (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    const ul = document.createElement('ul');
    for (const route of routes) {
      ul.appendChild(this.buildItem(route, nav, false));
    }
    this.appendChild(ul);
  }

  private buildItem(route: any, nav: any, sub: boolean): HTMLElement {
    const li = document.createElement('li');

    const children = Array.isArray(route.children)
      ? route.children
      : route.children
        ? Object.values(route.children)
        : undefined;
    const label = route.label || route.path || route.url || '';
    const hasKids = children?.length > 0;
    const href = route.url || route.path || '*';

    const btn = document.createElement(href && href !== '*' ? 'a' : 'button');
    if (btn instanceof HTMLAnchorElement) {
      btn.href = href;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.pushState({}, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    } else {
      btn.type = 'button';
      if (hasKids) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const isOpen = li.classList.contains('mm-open');
          if (isOpen) {
            li.classList.remove('mm-open');
            btn.setAttribute('aria-expanded', 'false');
          } else {
            li.classList.add('mm-open');
            btn.setAttribute('aria-expanded', 'true');
          }
        });
      }
    }
    btn.className = 'mm-link';
    if (href && href !== '*' && this.isActive(href)) {
      btn.classList.add('mm-active');
    }
    btn.textContent = label;

    if (hasKids) {
      const arrow = document.createElement('span');
      arrow.className = 'mm-arrow';
      arrow.textContent = '\u25BE';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.style.cssText = 'pointer-events:auto;padding:0 0.125rem;';
      btn.appendChild(arrow);

      const drop = document.createElement('div');
      drop.className = 'mm-drop';
      const subUl = document.createElement('ul');
      subUl.className = 'mm-sub';
      for (const child of children || []) {
        subUl.appendChild(this.buildItem(child, nav, true));
      }
      drop.appendChild(subUl);
      li.appendChild(drop);

      li.addEventListener('mouseenter', () => {
        const timer = this.closeTimers.get(li);
        if (timer) { clearTimeout(timer); this.closeTimers.delete(li); }
        li.classList.add('mm-open');
        btn.setAttribute('aria-expanded', 'true');
      });
      li.addEventListener('mouseleave', () => {
        const timer = setTimeout(() => {
          li.classList.remove('mm-open');
          btn.setAttribute('aria-expanded', 'false');
        }, 150);
        this.closeTimers.set(li, timer);
      });

      arrow.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = li.classList.contains('mm-open');
        if (isOpen) {
          li.classList.remove('mm-open');
          btn.setAttribute('aria-expanded', 'false');
        } else {
          li.classList.add('mm-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    }

    li.appendChild(btn);

    if (hasKids) {
      const drop = document.createElement('div');
      drop.className = 'mm-drop';
      const subUl = document.createElement('ul');
      subUl.className = 'mm-sub';
      for (const child of children || []) {
        subUl.appendChild(this.buildItem(child, nav, true));
      }
      drop.appendChild(subUl);
      li.appendChild(drop);

      li.addEventListener('mouseenter', () => {
        const timer = this.closeTimers.get(li);
        if (timer) { clearTimeout(timer); this.closeTimers.delete(li); }
        li.classList.add('mm-open');
        btn.setAttribute('aria-expanded', 'true');
      });
      li.addEventListener('mouseleave', () => {
        const timer = setTimeout(() => {
          li.classList.remove('mm-open');
          btn.setAttribute('aria-expanded', 'false');
        }, 150);
        this.closeTimers.set(li, timer);
      });

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = li.classList.contains('mm-open');
        if (isOpen) {
          li.classList.remove('mm-open');
          btn.setAttribute('aria-expanded', 'false');
        } else {
          li.classList.add('mm-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    }

    return li;
  }

  private isActive(routePath: string): boolean {
    const current = (window as any).__ux3RoutePath || window.location.pathname;
    if (routePath === '/') return current === '/' || current === '';
    return current === routePath || current.startsWith(routePath + '/');
  }
}
