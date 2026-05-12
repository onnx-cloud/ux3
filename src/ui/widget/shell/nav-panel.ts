/**
 * Navigation Panel — <ux-nav>
 *
 * Renders route links from app context nav config.  Auto-highlights the current
 * route and exposes a <slot> for custom branding/header content.
 *
 * variant="inline" renders bare links suitable for use inside a top-bar.
 */
export class UxNav extends HTMLElement {
  private _rafId: number | null = null;

  connectedCallback() {
    this.setAttribute('role', 'navigation');
    this.setAttribute('aria-label', 'Main navigation');
    this.render();
    this.subscribeToRouteChanges();
    if (!this.hasLinks()) {
      this.waitForAppReady();
    }
  }

  disconnectedCallback() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  private hasLinks(): boolean {
    const ctx = typeof window !== 'undefined' ? (window as any).__ux3App : null;
    const routes = (ctx?.nav?.routes || []).filter((r: any) => this.isNavigableView(r));
    return routes.length > 0;
  }

  private waitForAppReady() {
    const check = () => {
      this._rafId = null;
      if (this.hasLinks()) {
        this.render();
        return;
      }
      this._rafId = requestAnimationFrame(check);
    };
    this._rafId = requestAnimationFrame(check);
  }

  private render() {
    const ctx = typeof window !== 'undefined' ? (window as any).__ux3App : null;
    const navConfig = ctx?.nav;
    const routes = (navConfig?.routes || []).filter((r: any) => this.isNavigableView(r));
    const getLabel = navConfig?.getLabel as ((route: any) => string) | undefined;
    if (routes.length === 0) {
      this.innerHTML = '<slot></slot>';
      return;
    }

    const currentPath = this.getCurrentPath();

    this.innerHTML = '';

    const variant = this.getAttribute('variant') || 'default';

    if (variant === 'inline') {
      this.renderInline(routes, currentPath, getLabel);
    } else {
      this.renderDefault(routes, currentPath, getLabel);
    }
  }

  private isNavigableView(route: any): boolean {
    const app = (window as any).__ux3App;
    if (app?.machines && route.view in app.machines) {
      if (route.guard && app.nav?.canActivate) {
        return app.nav.canActivate(route.path);
      }
      return true;
    }
    return false;
  }

  private getCurrentPath(): string {
    return (window as any).__ux3RoutePath || (() => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#/')) return hash.slice(1);
      return window.location.pathname || '/';
    })();
  }

  private isActive(routePath: string): boolean {
    const currentPath = this.getCurrentPath();
    if (routePath === '/') return currentPath === '/' || currentPath === '';
    if (routePath === currentPath) return true;
    if (routePath.endsWith('/')) return currentPath === routePath || currentPath.startsWith(routePath);
    return currentPath.startsWith(routePath + '/') || currentPath === routePath;
  }

  private renderDefault(routes: any[], currentPath: string, getLabel?: (route: any) => string) {
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; }
      .ux-nav {
        display: flex;
        gap: 0.25rem;
        padding: 0.5rem 0.75rem;
        background: var(--ux-color-surface, #fff);
        border-bottom: 1px solid var(--ux-color-border, #e2e8f0);
        overflow-x: auto;
        white-space: nowrap;
      }
      .ux-nav a {
        display: inline-flex;
        align-items: center;
        padding: 0.375rem 0.75rem;
        border-radius: 0.375rem;
        color: var(--ux-color-text, #334155);
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        transition: background 0.15s, color 0.15s;
      }
      .ux-nav a:hover { background: var(--ux-color-surface-alt, #f1f5f9); }
      .ux-nav a.active { background: var(--ux-color-accent, #2563eb); color: #fff; }
      .ux-nav .brand {
        font-weight: 700;
        font-size: 0.9375rem;
        margin-right: 1rem;
        color: var(--ux-color-accent, #2563eb);
      }
    `;
    this.appendChild(style);

    const nav = document.createElement('nav');
    nav.className = 'ux-nav';

    const brand = document.createElement('span');
    brand.className = 'brand';
    brand.textContent = this.getAttribute('brand') || document.title || 'UX3';
    nav.appendChild(brand);

    for (const route of routes) {
      if (!route.path || route.path === '*') continue;
      const a = document.createElement('a');
      a.href = route.path;
      a.textContent = getLabel ? getLabel(route) : (route.label || route.view || route.path);
      if (this.isActive(route.path)) {
        a.classList.add('active');
      }
      a.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.pushState({}, '', route.path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      nav.appendChild(a);
    }

    this.appendChild(nav);
  }

  private renderInline(routes: any[], _currentPath: string, getLabel?: (route: any) => string) {
    const maxVisible = 6;
    const visible = routes.slice(0, maxVisible);
    const overflow = routes.slice(maxVisible);

    for (const route of visible) {
      this.appendLink(route, getLabel);
    }

    if (overflow.length > 0) {
      const wrapper = document.createElement('span');
      wrapper.style.cssText = 'position:relative;';

      const toggle = document.createElement('a');
      toggle.href = '#';
      toggle.setAttribute('data-nav-link', '');
      toggle.textContent = 'More...';
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const menu = wrapper.querySelector<HTMLElement>('.ux-nav-overflow');
        if (!menu) return;
        const open = menu.style.display === 'block';
        menu.style.display = open ? 'none' : 'block';
      });

      const menu = document.createElement('div');
      menu.className = 'ux-nav-overflow';
      menu.style.cssText = 'display:none;position:absolute;top:100%;right:0;z-index:50;min-width:10rem;border-radius:0.5rem;border:1px solid var(--color-border,#e2e8f0);background:var(--color-bg,#fff);box-shadow:0 4px 12px rgba(0,0,0,0.1);padding:0.25rem 0;';

      for (const route of overflow) {
        const a = this.makeOverflowLink(route, getLabel);
        menu.appendChild(a);
      }

      wrapper.appendChild(toggle);
      wrapper.appendChild(menu);

      document.addEventListener('click', (ev: Event) => {
        if (!wrapper.contains(ev.target as Node)) {
          menu.style.display = 'none';
        }
      });

      this.appendChild(wrapper);
    }
  }

  private appendLink(route: any, getLabel?: (route: any) => string): HTMLElement {
    const a = document.createElement('a');
    a.href = route.path;
    a.setAttribute('data-nav-link', '');
    a.textContent = getLabel ? getLabel(route) : (route.label || route.view || route.path);
    if (this.isActive(route.path)) {
      a.classList.add('active');
    }
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({}, '', route.path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    this.appendChild(a);
    return a;
  }

  private makeOverflowLink(route: any, getLabel?: (route: any) => string): HTMLElement {
    const a = document.createElement('a');
    a.href = route.path;
    a.style.cssText = 'display:block;padding:0.375rem 0.75rem;color:var(--color-text,#334155);text-decoration:none;font-size:0.875rem;font-weight:500;white-space:nowrap;transition:background 0.15s;';
    a.textContent = getLabel ? getLabel(route) : (route.label || route.view || route.path);
    if (this.isActive(route.path)) {
      a.style.backgroundColor = 'var(--color-primary,#dbeafe)';
      a.style.color = 'var(--color-text,#334155)';
    }
    a.addEventListener('mouseenter', () => { a.style.backgroundColor = 'var(--color-bg-muted,#f1f5f9)'; });
    a.addEventListener('mouseleave', () => { if (!this.isActive(route.path)) a.style.backgroundColor = ''; });
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({}, '', route.path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    return a;
  }

  private subscribeToRouteChanges() {
    window.addEventListener('popstate', () => {
      requestAnimationFrame(() => this.render());
    });
    window.addEventListener('ux3:navigate', () => this.render());
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('ux-nav')) {
  customElements.define('ux-nav', UxNav);
}
