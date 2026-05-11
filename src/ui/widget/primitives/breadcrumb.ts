import { UxBase } from './base.js';

export class UxBreadcrumb extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('aria-label', 'Breadcrumb');
    this.renderBreadcrumb();
    window.addEventListener('popstate', () => requestAnimationFrame(() => this.renderBreadcrumb()));
    window.addEventListener('ux3:navigate', () => this.renderBreadcrumb());
  }

  private renderBreadcrumb(): void {
    const sep = '<span class="ux-crumb-sep">/</span>';
    const currentPath = (window as any).__ux3RoutePath || window.location.pathname || '/';
    const viewName = this.extractViewFromPath(currentPath);
    const tabName = this.extractActiveTab();

    const crumbs: string[] = [];

    if (viewName) {
      crumbs.push(`<a href="/" class="ux-crumb-link ux-crumb-home" title="Home">\u2302</a>`);
      crumbs.push(sep);
      if (tabName) {
        crumbs.push(`<a href="${currentPath}" class="ux-crumb-link">${viewName}</a>`);
        crumbs.push(sep);
        crumbs.push(`<span class="ux-crumb-current">${tabName}</span>`);
      } else {
        crumbs.push(`<span class="ux-crumb-current">${viewName}</span>`);
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
          ? `<span class="ux-crumb-current">${s}</span>`
          : `<a href="${href}" class="ux-crumb-link">${s}</a>${sep}`;
      }).join('') || '<slot></slot>';
    } else {
      this.innerHTML = '<slot></slot>';
    }
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
