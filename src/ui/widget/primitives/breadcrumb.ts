import { UxBase } from './base.js';

export class UxBreadcrumb extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('aria-label', 'Breadcrumb');
    this.renderBreadcrumb();
    window.addEventListener('popstate', () => requestAnimationFrame(() => this.renderBreadcrumb()));
    window.addEventListener('ux:app.route.navigate', () => this.renderBreadcrumb());
  }

  private renderBreadcrumb(): void {
    const sep = '<span class="ux-crumb-sep">/</span>';
    const currentPath = (window as any).__ux3RoutePath || window.location.pathname || '/';
    const app = (window as any).__ux3App;

    if (app?.nav?.getBreadcrumbs) {
      const crumbs = app.nav.getBreadcrumbs(currentPath);
      if (crumbs.length > 0) {
        const parts: string[] = [];
        parts.push('<a href="/" class="ux-crumb-link ux-crumb-home" title="Home">&#x2302;</a>');
        for (let i = 0; i < crumbs.length; i++) {
          parts.push(sep);
          const crumb = crumbs[i];
          const isLast = i === crumbs.length - 1;
          if (isLast) {
            parts.push(`<span class="ux-crumb-current">${this.esc(crumb.label)}</span>`);
          } else {
            parts.push(`<a href="${this.esc(crumb.path)}" class="ux-crumb-link">${this.esc(crumb.label)}</a>`);
          }
        }
        this.innerHTML = parts.join('');
        return;
      }
    }

    const viewName = this.extractViewFromPath(currentPath);
    const tabName = this.extractActiveTab();

    const crumbs: string[] = [];

    if (viewName) {
      crumbs.push('<a href="/" class="ux-crumb-link ux-crumb-home" title="Home">&#x2302;</a>');
      crumbs.push(sep);
      if (tabName) {
        crumbs.push(`<a href="${currentPath}" class="ux-crumb-link">${this.esc(viewName)}</a>`);
        crumbs.push(sep);
        crumbs.push(`<span class="ux-crumb-current">${this.esc(tabName)}</span>`);
      } else {
        crumbs.push(`<span class="ux-crumb-current">${this.esc(viewName)}</span>`);
      }
      this.innerHTML = crumbs.join('');
      return;
    }

    const pathAttrib = this.getAttribute('path');
    if (pathAttrib) {
      const segments = pathAttrib.split('/').filter(Boolean);
      this.innerHTML = segments.map((s, i) => {
        const isLast = i === segments.length - 1;
        const href = '/' + segments.slice(0, i + 1).join('/');
        return isLast
          ? `<span class="ux-crumb-current">${this.esc(s)}</span>`
          : `<a href="${href}" class="ux-crumb-link">${this.esc(s)}</a>${sep}`;
      }).join('') || '<slot></slot>';
    } else {
      this.innerHTML = '<slot></slot>';
    }
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private extractActiveTab(): string | null {
    if (typeof document === 'undefined') return null;
    const tabs = document.querySelector('ux-tabs') as HTMLElement | null;
    if (!tabs) return null;
    const selected = tabs.querySelector('[aria-selected="true"], [selected]');
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
