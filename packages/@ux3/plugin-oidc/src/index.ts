import type { Plugin } from '../../../../src/plugin/registry';
import type { AppContext } from '../../../../src/ui/app';

export type OidcProvider = 'google' | 'okta' | 'auth0' | 'cognito' | 'custom';

export interface OidcEndpoints {
  authorize?: string;
  token?: string;
  userinfo?: string;
  logout?: string;
  revocation?: string;
  jwks?: string;
}

export interface OidcConfig {
  provider?: OidcProvider | string;
  issuer?: string;
  authority?: string;
  clientId?: string;
  client_id?: string;
  clientSecret?: string;
  client_secret?: string;
  redirectUri?: string;
  redirect_uri?: string;
  postLogoutRedirectUri?: string;
  post_logout_redirect_uri?: string;
  responseType?: string;
  response_type?: string;
  scope?: string;
  audience?: string;
  discovery?: boolean;
  pkce?: boolean;
  storageKey?: string;
  autoHandleCallback?: boolean;
  endpoints?: OidcEndpoints;
}

export interface OidcTokens {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  expires_at?: number;
}

interface OidcResolvedConfig {
  provider: OidcProvider;
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  postLogoutRedirectUri?: string;
  responseType: string;
  scope: string;
  audience?: string;
  discovery: boolean;
  pkce: boolean;
  storageKey: string;
  autoHandleCallback: boolean;
  endpoints: OidcEndpoints;
}

function joinUrl(base: string, suffix: string): string {
  const trimmedBase = base.replace(/\/$/, '');
  const trimmedSuffix = suffix.replace(/^\//, '');
  return `${trimmedBase}/${trimmedSuffix}`;
}

function normalizeProvider(value: unknown): OidcProvider {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'google') return 'google';
  if (v === 'okta') return 'okta';
  if (v === 'auth0') return 'auth0';
  if (v === 'cognito') return 'cognito';
  return 'custom';
}

function toBaseConfig(raw?: OidcConfig): Partial<OidcResolvedConfig> {
  if (!raw) return {};
  const base: Partial<OidcResolvedConfig> = {
    endpoints: { ...(raw.endpoints || {}) },
  };

  if (raw.provider !== undefined) base.provider = normalizeProvider(raw.provider);
  if (raw.issuer || raw.authority) base.issuer = raw.issuer || raw.authority;
  if (raw.clientId || raw.client_id) base.clientId = raw.clientId || raw.client_id;
  if (raw.clientSecret || raw.client_secret) base.clientSecret = raw.clientSecret || raw.client_secret;
  if (raw.redirectUri || raw.redirect_uri) base.redirectUri = raw.redirectUri || raw.redirect_uri;
  if (raw.postLogoutRedirectUri || raw.post_logout_redirect_uri) {
    base.postLogoutRedirectUri = raw.postLogoutRedirectUri || raw.post_logout_redirect_uri;
  }
  if (raw.responseType || raw.response_type) base.responseType = raw.responseType || raw.response_type;
  if (raw.scope) base.scope = raw.scope;
  if (raw.audience) base.audience = raw.audience;
  if (raw.discovery !== undefined) base.discovery = raw.discovery;
  if (raw.pkce !== undefined) base.pkce = raw.pkce;
  if (raw.storageKey) base.storageKey = raw.storageKey;
  if (raw.autoHandleCallback !== undefined) base.autoHandleCallback = raw.autoHandleCallback;

  return base;
}

export function createProviderPreset(provider: OidcProvider, issuer?: string): OidcEndpoints {
  const base = (issuer || '').replace(/\/$/, '');

  if (provider === 'google') {
    return {
      authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
      userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
      revocation: 'https://oauth2.googleapis.com/revoke',
      jwks: 'https://www.googleapis.com/oauth2/v3/certs',
    };
  }

  if (!base) {
    return {};
  }

  if (provider === 'okta') {
    return {
      authorize: joinUrl(base, 'v1/authorize'),
      token: joinUrl(base, 'v1/token'),
      userinfo: joinUrl(base, 'v1/userinfo'),
      logout: joinUrl(base, 'v1/logout'),
      revocation: joinUrl(base, 'v1/revoke'),
      jwks: joinUrl(base, 'v1/keys'),
    };
  }

  if (provider === 'auth0') {
    return {
      authorize: joinUrl(base, 'authorize'),
      token: joinUrl(base, 'oauth/token'),
      userinfo: joinUrl(base, 'userinfo'),
      logout: joinUrl(base, 'v2/logout'),
    };
  }

  if (provider === 'cognito') {
    return {
      authorize: joinUrl(base, 'oauth2/authorize'),
      token: joinUrl(base, 'oauth2/token'),
      userinfo: joinUrl(base, 'oauth2/userInfo'),
      logout: joinUrl(base, 'logout'),
      revocation: joinUrl(base, 'oauth2/revoke'),
    };
  }

  return {};
}

function randomString(length = 48): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function toBase64Url(input: Uint8Array): string {
  const nodeBuffer = (globalThis as any).Buffer;
  if (nodeBuffer?.from) {
    return nodeBuffer.from(input)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  let binary = '';
  input.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function pkceChallenge(verifier: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    return toBase64Url(new Uint8Array(digest));
  }

  return verifier;
}

function safeStorageGet(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  } catch {
    // no-op
  }
}

function safeStorageRemove(key: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

function deriveRedirectUri(explicit?: string): string {
  if (explicit) return explicit;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${window.location.pathname}`;
  }
  return '';
}

function pickLegacyProviderConfig(oauthRoot: any, provider: OidcProvider): OidcConfig | null {
  if (!oauthRoot || typeof oauthRoot !== 'object') {
    return null;
  }

  if (provider !== 'custom' && oauthRoot[provider]) {
    return { ...(oauthRoot[provider] as OidcConfig), provider };
  }

  const first = Object.entries(oauthRoot).find(([, value]) => value && typeof value === 'object');
  if (!first) return null;
  const [key, value] = first;
  return { ...(value as OidcConfig), provider: normalizeProvider(key) };
}

function resolveConfig(app: AppContext, inlineConfig?: OidcConfig): OidcResolvedConfig {
  const fromPluginsByName = (app.config as any)?.plugins?.['@ux3/plugin-oidc'] as OidcConfig | undefined;
  const fromPluginsAlias = (app.config as any)?.plugins?.oidc as OidcConfig | undefined;
  const seed = toBaseConfig(fromPluginsByName || fromPluginsAlias || inlineConfig);
  const provider = seed.provider || 'custom';
  const legacy = pickLegacyProviderConfig((app.config as any)?.oauth, provider);

  const merged = {
    ...toBaseConfig(legacy || undefined),
    ...seed,
    endpoints: {
      ...createProviderPreset(provider, seed.issuer || (legacy?.issuer || legacy?.authority)),
      ...(toBaseConfig(legacy || undefined).endpoints || {}),
      ...(seed.endpoints || {}),
    },
  } as OidcResolvedConfig;

  merged.provider = provider;
  merged.responseType = merged.responseType || 'code';
  merged.scope = merged.scope || 'openid profile email';
  merged.discovery = merged.discovery !== false;
  merged.pkce = merged.pkce !== false;
  merged.storageKey = merged.storageKey || 'ux3.oidc';
  merged.autoHandleCallback = merged.autoHandleCallback !== false;
  merged.redirectUri = deriveRedirectUri(merged.redirectUri);

  return merged;
}

function validateResolvedConfig(cfg: OidcResolvedConfig): void {
  const missing: string[] = [];
  const hasIssuer = !!cfg.issuer;
  const hasAuthorizeEndpoint = !!cfg.endpoints.authorize;
  const hasTokenEndpoint = !!cfg.endpoints.token;

  if (!cfg.clientId) {
    missing.push('clientId');
  }

  if (!hasIssuer && !hasAuthorizeEndpoint) {
    missing.push('issuer/authority or endpoints.authorize');
  }

  if (cfg.responseType === 'code') {
    if (!cfg.redirectUri) {
      missing.push('redirectUri');
    }
    if (!hasIssuer && !hasTokenEndpoint) {
      missing.push('issuer/authority or endpoints.token');
    }
  }

  if (missing.length > 0) {
    throw new Error(`[plugin-oidc] Invalid configuration. Missing required field(s): ${missing.join(', ')}`);
  }
}

function resolveLabel(app: AppContext, key: string, fallback: string): string {
  const value = app.i18n?.(key);
  return value && value !== key ? value : fallback;
}

function ensureOidcControlsElement(app: AppContext): void {
  if (
    typeof window === 'undefined' ||
    typeof customElements === 'undefined' ||
    customElements.get('ux-oidc-controls')
  ) {
    return;
  }

  const labelLogin = resolveLabel(app, 'common.actions.login', 'Sign in');
  const labelLogout = resolveLabel(app, 'common.actions.logout', 'Sign out');
  const labelAuthenticated = resolveLabel(app, 'common.auth.authenticated', 'Authenticated');
  const labelUnauthenticated = resolveLabel(app, 'common.auth.unauthenticated', 'Not signed in');
  const getActiveApp = (): AppContext => ((window as any).__ux3App as AppContext) || app;

  class UxOidcControls extends HTMLElement {
    private refresh = () => this.render();

    connectedCallback(): void {
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });
      }
      this.render();
      window.addEventListener('focus', this.refresh);
      window.addEventListener('storage', this.refresh);
    }

    disconnectedCallback(): void {
      window.removeEventListener('focus', this.refresh);
      window.removeEventListener('storage', this.refresh);
    }

    private render(): void {
      const activeApp = getActiveApp();
      const oidc = (activeApp.utils as any)?.oidc;
      const isAuthenticated = !!oidc?.isAuthenticated?.();
      const config = oidc?.getConfig?.();
      const provider = String(config?.provider || 'oidc').toUpperCase();
      const token = (activeApp.utils as any)?.oidcAccessToken?.() as string | null;
      const tokenHint = token ? `${token.slice(0, 6)}...${token.slice(-4)}` : 'none';

      if (!this.shadowRoot) {
        return;
      }

      const statusText = isAuthenticated ? `Connected to ${provider}` : `Not connected (${provider})`;
      const tokenText = tokenHint;

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-flex; }
          .oidc-controls { display: inline-flex; align-items: center; gap: 0.5rem; }
          .oidc-status { font-size: 0.75rem; color: #475569; }
          button { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; border-radius: 0.375rem; padding: 0.375rem 0.625rem; cursor: pointer; font-size: 0.8125rem; }
          button:hover { background: #f8fafc; }
        </style>
        <div class="oidc-controls">
          <span class="oidc-status">${statusText} · token ${tokenText}</span>
          ${isAuthenticated
            ? '<button type="button" data-action="logout">' + labelLogout + '</button>'
            : '<button type="button" data-action="login">' + labelLogin + '</button>'}
        </div>
      `;

      this.shadowRoot.querySelector('[data-action="login"]')?.addEventListener('click', () => {
        const currentApp = getActiveApp();
        void (currentApp.utils as any).oidcLogin?.();
      });
      this.shadowRoot.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
        const currentApp = getActiveApp();
        void (currentApp.utils as any).oidcLogout?.().finally(() => this.render());
      });
    }
  }

  customElements.define('ux-oidc-controls', UxOidcControls);
}

export class OidcService {
  private cfg: OidcResolvedConfig;
  private discovered = false;

  constructor(cfg: OidcResolvedConfig) {
    this.cfg = cfg;
  }

  private key(suffix: string): string {
    return `${this.cfg.storageKey}:${suffix}`;
  }

  getConfig(): OidcResolvedConfig {
    return this.cfg;
  }

  async discoverEndpoints(): Promise<void> {
    if (this.discovered || !this.cfg.discovery || !this.cfg.issuer || typeof fetch !== 'function') {
      this.discovered = true;
      return;
    }

    const wellKnown = joinUrl(this.cfg.issuer, '.well-known/openid-configuration');
    try {
      const response = await fetch(wellKnown);
      if (!response.ok) {
        this.discovered = true;
        return;
      }

      const data = await response.json();
      this.cfg.endpoints = {
        authorize: this.cfg.endpoints.authorize || data.authorization_endpoint,
        token: this.cfg.endpoints.token || data.token_endpoint,
        userinfo: this.cfg.endpoints.userinfo || data.userinfo_endpoint,
        logout: this.cfg.endpoints.logout || data.end_session_endpoint,
        revocation: this.cfg.endpoints.revocation || data.revocation_endpoint,
        jwks: this.cfg.endpoints.jwks || data.jwks_uri,
      };
    } catch {
      // Discovery failures should not crash app startup.
    } finally {
      this.discovered = true;
    }
  }

  private readTokens(): OidcTokens | null {
    const raw = safeStorageGet(this.key('tokens'));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as OidcTokens;
    } catch {
      return null;
    }
  }

  private writeTokens(tokens: OidcTokens): OidcTokens {
    const expiresAt = tokens.expires_in
      ? Date.now() + (Number(tokens.expires_in) * 1000)
      : tokens.expires_at;
    const enriched = { ...tokens, expires_at: expiresAt };
    safeStorageSet(this.key('tokens'), JSON.stringify(enriched));
    return enriched;
  }

  getTokens(): OidcTokens | null {
    return this.readTokens();
  }

  getAccessToken(): string | null {
    const tokens = this.readTokens();
    return tokens?.access_token || null;
  }

  isAuthenticated(): boolean {
    const tokens = this.readTokens();
    if (!tokens?.access_token) return false;
    if (!tokens.expires_at) return true;
    return Date.now() < tokens.expires_at;
  }

  clearSession(): void {
    safeStorageRemove(this.key('tokens'));
    safeStorageRemove(this.key('state'));
    safeStorageRemove(this.key('verifier'));
  }

  async buildAuthorizationUrl(extra: Record<string, string> = {}): Promise<string> {
    await this.discoverEndpoints();
    const endpoint = this.cfg.endpoints.authorize;
    if (!endpoint) {
      throw new Error('OIDC authorize endpoint is not configured');
    }

    const state = randomString(24);
    safeStorageSet(this.key('state'), state);

    const params = new URLSearchParams({
      response_type: this.cfg.responseType,
      client_id: this.cfg.clientId || '',
      redirect_uri: this.cfg.redirectUri || '',
      scope: this.cfg.scope,
      state,
      ...extra,
    });

    if (this.cfg.audience && !params.has('audience')) {
      params.set('audience', this.cfg.audience);
    }

    if (this.cfg.responseType === 'code' && this.cfg.pkce) {
      const verifier = randomString(64);
      safeStorageSet(this.key('verifier'), verifier);
      params.set('code_challenge_method', 'S256');
      params.set('code_challenge', await pkceChallenge(verifier));
    }

    return `${endpoint}?${params.toString()}`;
  }

  async login(extra: Record<string, string> = {}): Promise<string> {
    const url = await this.buildAuthorizationUrl(extra);
    if (typeof window !== 'undefined') {
      window.location.assign(url);
    }
    return url;
  }

  async exchangeCode(code: string): Promise<OidcTokens> {
    await this.discoverEndpoints();
    const endpoint = this.cfg.endpoints.token;
    if (!endpoint) {
      throw new Error('OIDC token endpoint is not configured');
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.cfg.clientId || '',
      redirect_uri: this.cfg.redirectUri || '',
    });

    const verifier = safeStorageGet(this.key('verifier'));
    if (verifier) {
      body.set('code_verifier', verifier);
    }

    if (this.cfg.clientSecret) {
      body.set('client_secret', this.cfg.clientSecret);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`OIDC token exchange failed: ${response.status}`);
    }

    const tokens = await response.json() as OidcTokens;
    const persisted = this.writeTokens(tokens);
    safeStorageRemove(this.key('verifier'));
    return persisted;
  }

  async handleCallback(urlInput?: string): Promise<{ ok: boolean; tokens?: OidcTokens; error?: string }> {
    const currentUrl = urlInput || (typeof window !== 'undefined' ? window.location.href : '');
    if (!currentUrl) {
      return { ok: false, error: 'No callback URL available' };
    }

    const url = new URL(currentUrl);
    const error = url.searchParams.get('error');
    if (error) {
      return { ok: false, error };
    }

    const code = url.searchParams.get('code');
    if (!code) {
      return { ok: false, error: 'Missing code query parameter' };
    }

    const expectedState = safeStorageGet(this.key('state'));
    const returnedState = url.searchParams.get('state');
    if (expectedState && returnedState !== expectedState) {
      return { ok: false, error: 'Invalid state parameter' };
    }

    const tokens = await this.exchangeCode(code);
    safeStorageRemove(this.key('state'));
    return { ok: true, tokens };
  }

  async fetchUserInfo(): Promise<Record<string, unknown>> {
    await this.discoverEndpoints();
    const endpoint = this.cfg.endpoints.userinfo;
    const accessToken = this.getAccessToken();
    if (!endpoint || !accessToken) {
      throw new Error('Cannot fetch user info without userinfo endpoint and access token');
    }

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OIDC userinfo request failed: ${response.status}`);
    }

    return await response.json() as Record<string, unknown>;
  }

  async logout(extra: Record<string, string> = {}): Promise<string | null> {
    await this.discoverEndpoints();
    const logoutEndpoint = this.cfg.endpoints.logout;
    const idToken = this.readTokens()?.id_token;
    this.clearSession();

    if (!logoutEndpoint) {
      return null;
    }

    const params = new URLSearchParams({ ...extra });
    if (this.cfg.postLogoutRedirectUri && !params.has('post_logout_redirect_uri')) {
      params.set('post_logout_redirect_uri', this.cfg.postLogoutRedirectUri);
    }
    if (idToken && !params.has('id_token_hint')) {
      params.set('id_token_hint', idToken);
    }
    if (this.cfg.clientId && !params.has('client_id')) {
      params.set('client_id', this.cfg.clientId);
    }

    const url = `${logoutEndpoint}${params.toString() ? `?${params.toString()}` : ''}`;
    if (typeof window !== 'undefined') {
      window.location.assign(url);
    }
    return url;
  }
}

export const OidcPlugin: Plugin = {
  name: '@ux3/plugin-oidc',
  version: '1.0.0',
  description: 'OIDC/OAuth2 plugin with presets for Google, Okta, Auth0, and Cognito',
  install(app: AppContext) {
    const inlineConfig = ((this as any)?.config || (OidcPlugin as any)?.config) as OidcConfig | undefined;
    const cfg = resolveConfig(app, inlineConfig);
    validateResolvedConfig(cfg);
    const service = new OidcService(cfg);

    if (app.registerService) {
      app.registerService('ux3.service.oidc', () => service as any);
    } else {
      (app.services as any)['ux3.service.oidc'] = service as any;
    }

    app.utils = app.utils || {};
    (app.utils as any).oidc = service;
    (app.utils as any).oidcLogin = (extra?: Record<string, string>) => service.login(extra || {});
    (app.utils as any).oidcLogout = (extra?: Record<string, string>) => service.logout(extra || {});
    (app.utils as any).oidcHandleCallback = (url?: string) => service.handleCallback(url);
    (app.utils as any).oidcAccessToken = () => service.getAccessToken();

    ensureOidcControlsElement(app);

    if (cfg.autoHandleCallback && typeof window !== 'undefined') {
      const qs = new URLSearchParams(window.location.search);
      if (qs.has('code') || qs.has('error')) {
        void service.handleCallback().catch(() => {
          // callback handling should not crash app bootstrap
        });
      }
    }
  }
};

export default OidcPlugin;