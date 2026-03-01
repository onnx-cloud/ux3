import type { Plugin } from "../plugin/registry";
import { AppLifecyclePhase } from "../core/lifecycle";
import type { AppContext } from "../ui/app";

export interface Route {
  path: string;
  view: string;
  label?: string;
  params?: string[];
}

export class RouterService {
  private context: AppContext;
  private routes: Route[];

  constructor(app: AppContext, routes: Route[]) {
    this.context = app;
    this.routes = routes;
  }

  start() {
    if (typeof window === 'undefined') return;
    window.addEventListener('popstate', (evt) => {
      const path = (evt.state && evt.state.path) || window.location.pathname;
      this.navigate(path);
    });
  }

  navigate(path: string) {
    const match = this.routes.find(r => r.path === path);
    if (!match) return;
    // update context nav if available
    if (this.context.nav) {
      this.context.nav.current = { path, view: match.view, params: {} } as any;
    }
  }
}

export const SpaRouter: Plugin = {
  name: 'spa-router',
  version: '1.0.0',
  install(app: AppContext) {
    // attach simple router service based on config routes
    const routes = (app as any).config?.routes || [];
    app.services['ux3.service.router'] = new RouterService(app, routes);
  },
  services: {
    'ux3.service.router': RouterService
  },
  hooks: {
    app: {
      [AppLifecyclePhase.READY]: [
        async (ctx) => {
          ctx.app?.services['ux3.service.router']?.start?.();
          ctx.app?.logger?.log('sys.router.start');
        }
      ]
    }
  }
};
