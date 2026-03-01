import type { Plugin } from "../plugin/registry";
import { AppLifecyclePhase } from "../core/lifecycle";

export class AuthService {
  private token: string | null = null;
  async restoreSession() {
    if (typeof window !== 'undefined') {
      this.token = window.localStorage.getItem('iam-token');
    }
  }
  async login(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('iam-token', token);
    }
  }
  async logout() {
    this.token = null;
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('iam-token');
    }
  }
  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const SpaAuth: Plugin = {
  name: 'spa-auth',
  version: '1.0.0',
  install(app) {
    app.services['ux3.service.auth'] = new AuthService();
  },
  services: {
    'ux3.service.auth': AuthService
  },
  hooks: {
    app: {
      [AppLifecyclePhase.HYDRATE]: [
        async (ctx) => {
          await ctx.app?.services['ux3.service.auth']?.restoreSession?.();
        }
      ]
    }
  }
};
