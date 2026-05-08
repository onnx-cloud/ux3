/**
 * Navigation Panel — <ux-nav>
 *
 * Renders route links from app context nav config.  Auto-highlights the current
 * route and exposes a <slot> for custom branding/header content.
 *
 * variant="inline" renders bare links suitable for use inside a top-bar.
 */
export class UxNav extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'navigation');
    this.setAttribute('aria-label', 'Main navigation');
    this.render();
    this.subscribeToRouteChanges();
  }

  private render() {
    const ctx = typeof window !== 'undefined' ? (window as any).__ux3App : null;
    const navConfig = ctx?.nav;
    const routes = navConfig?.routes || [];
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
    for (const route of routes) {
      if (!route.path || route.path === '*') continue;
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
    }
  }

  private subscribeToRouteChanges() {
    window.addEventListener('popstate', () => this.render());
    window.addEventListener('ux3:navigate', () => this.render());
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('ux-nav')) {
  customElements.define('ux-nav', UxNav);
}
