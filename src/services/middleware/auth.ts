import type { Middleware } from '../types.js';

export class AuthProvider {
  private tokenStore = new Map<string, { token: string; expiresAt: number }>();

  async getToken(provider: string): Promise<string | null> {
    const entry = this.tokenStore.get(provider);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.tokenStore.delete(provider);
      return null;
    }
    return entry.token;
  }

  async setToken(provider: string, token: string, ttlMs = 3600_000): Promise<void> {
    this.tokenStore.set(provider, { token, expiresAt: Date.now() + ttlMs });
  }

  clearToken(provider: string): void {
    this.tokenStore.delete(provider);
  }
}

export const authMiddleware = (getToken: (request: unknown) => Promise<string | null>): Middleware => {
  return async (request, next) => {
    const token = await getToken(request);
    if (token) {
      const r = request as Record<string, unknown>;
      r.headers = {
        ...(r.headers as Record<string, string> || {}),
        'Authorization': `Bearer ${token}`,
      };
    }
    return next(request);
  };
};
