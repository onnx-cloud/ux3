import type { Plugin } from "../plugin/registry";
import { AppLifecyclePhase } from "../core/lifecycle";
import { version } from '../../package.json'

export class AuthService {
  private token: string | null = null;
  async restore() {
    if (typeof window !== 'undefined') {
      this.token = window.localStorage.getItem('token');
    }
  }
  async login(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('token', token);
    }
  }
  async logout() {
    this.token = null;
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
    }
  }
  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const SpaAuth: Plugin = {
  name: 'ux3.service.auth',
  version: version,
  install(app) {
    (app.services as any)['ux3.service.auth'] = new AuthService();
  },
  services: {
    'ux3.service.auth': () => new AuthService()
  },
  hooks: {
    app: {
      [AppLifecyclePhase.HYDRATE]: [
        async (ctx) => {
          await (ctx.app?.services as any)?.['ux3.service.auth']?.restoreSession?.();
        }
      ]
    }
  }
};
