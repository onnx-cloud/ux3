/**
 * Navigation Panel — <ux-nav>
 *
 * Renders route links from app context nav config.  Auto-highlights the current
 * route and exposes a <slot> for custom branding/header content.
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
    const routes = ctx?.nav?.routes || [];
    if (routes.length === 0) {
      this.innerHTML = '<slot></slot>';
      return;
    }

    const currentPath = window.location.pathname || '/';

    this.innerHTML = '';
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
      a.textContent = route.label || route.view || route.path;
      if (currentPath === route.path || (route.path !== '/' && currentPath.startsWith(route.path))) {
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

  private subscribeToRouteChanges() {
    window.addEventListener('popstate', () => this.render());
    // Also re-render on custom nav events
    window.addEventListener('ux3:navigate', () => this.render());
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('ux-nav')) {
  customElements.define('ux-nav', UxNav);
}
