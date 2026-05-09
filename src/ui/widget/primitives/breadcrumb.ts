import { UxBase } from './base.js';

export class UxBreadcrumb extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('aria-label', 'Breadcrumb');
    this.renderBreadcrumb();

    window.addEventListener('popstate', () => {
      requestAnimationFrame(() => this.renderBreadcrumb());
    });
    window.addEventListener('ux3:navigate', () => this.renderBreadcrumb());
  }

  private renderBreadcrumb(): void {
    const separator = this.getAttribute('separator') || '/';
    const pathAttrib = this.getAttribute('path');
    const currentPath = (window as any).__ux3RoutePath || window.location.pathname || '/';
    const viewName = this.extractViewFromPath(currentPath);
    const tabName = this.extractActiveTab();

    const crumbs: string[] = [];

    if (viewName) {
      crumbs.push(`<a href="/" class="ux-crumb-link">Home</a>`);
      const viewPath = currentPath === '/' ? '/components' : currentPath;
      crumbs.push(`<a href="${viewPath}" class="ux-crumb-link">${viewName}</a>`);
      if (tabName) {
        crumbs.push(`<span class="ux-crumb-sep">${separator}</span>`);
        crumbs.push(`<span class="ux-crumb-current">${tabName}</span>`);
      }
      this.innerHTML = crumbs.join('\n');
      return;
    }

    if (pathAttrib) {
      const segments = pathAttrib.split('/').filter(Boolean);
      this.innerHTML = segments.map((s, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/');
        return i === segments.length - 1
          ? `<span class="ux-crumb-current">${s}</span>`
          : `<a href="${href}" class="ux-crumb-link">${s}</a><span class="ux-crumb-sep">${separator}</span>`;
      }).join('\n') || '<slot></slot>';
    } else {
      this.innerHTML = '<slot></slot>';
    }
  }

  private extractActiveTab(): string | null {
    const findTabs = (root: Document | ShadowRoot | Element): HTMLElement | null => {
      const tabs = root.querySelector('ux-tabs') as HTMLElement | null;
      if (tabs) return tabs;
      for (const el of root.querySelectorAll('*')) {
        const shadow = (el as any).shadowRoot;
        if (shadow) {
          const found = findTabs(shadow);
          if (found) return found;
        }
      }
      return null;
    };
    if (typeof document === 'undefined') return null;
    const tabs = findTabs(document);
    if (!tabs) return null;
    const selected = tabs.querySelector('[aria-selected="true"], [selected], ux-tab[selected]');
    return selected?.textContent?.trim() || null;
  }

  private extractViewFromPath(pathname: string): string | null {
    const app = (window as any).__ux3App;
    if (!app?.nav?.routes) return null;
    for (const route of app.nav.routes) {
      if (route.path === pathname) return route.view;
      if (route.path === '/' && pathname === '/') return route.view;
    }
    return null;
  }
}
