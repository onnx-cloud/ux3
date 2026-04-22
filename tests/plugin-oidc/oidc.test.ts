import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OidcPlugin, { createProviderPreset, OidcService } from '@ux3/plugin-oidc';

describe('OIDC plugin', () => {
  let app: any;

  beforeEach(() => {
    app = {
      config: {
        plugins: {
          '@ux3/plugin-oidc': {
            provider: 'auth0',
            authority: 'https://tenant.auth0.com',
            clientId: 'client-123',
            redirectUri: 'http://localhost:1337/callback',
            scope: 'openid profile email',
          },
        },
      },
      services: {},
      utils: {},
    };

    (globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: 'access-token', token_type: 'Bearer', expires_in: 3600 }),
    }));

    (window as any).__ux3App = app;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    delete (OidcPlugin as any).config;
    delete (window as any).__ux3App;
    document.body.innerHTML = '';
  });

  it('exposes service and helpers', () => {
    OidcPlugin.install?.(app as any);

    expect(app.services['ux3.service.oidc']).toBeInstanceOf(OidcService);
    expect(typeof app.utils.oidcLogin).toBe('function');
    expect(typeof app.utils.oidcHandleCallback).toBe('function');
    expect(typeof app.utils.oidcLogout).toBe('function');
    expect(customElements.get('ux-oidc-controls')).toBeDefined();
  });

  it('wires the custom element login button to the helper', () => {
    OidcPlugin.install?.(app as any);
    const loginSpy = vi.spyOn(app.utils, 'oidcLogin').mockResolvedValue('https://tenant.auth0.com/authorize');

    const element = document.createElement('ux-oidc-controls');
    document.body.appendChild(element);

    const button = element.shadowRoot?.querySelector('button[data-action="login"]') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();

    expect(loginSpy).toHaveBeenCalledTimes(1);
    element.remove();
  });

  it('builds an authorization URL with provider presets', async () => {
    OidcPlugin.install?.(app as any);
    const service = app.services['ux3.service.oidc'] as OidcService;

    const url = await service.buildAuthorizationUrl({ prompt: 'login' });
    const parsed = new URL(url);

    expect(parsed.origin).toBe('https://tenant.auth0.com');
    expect(parsed.pathname).toBe('/authorize');
    expect(parsed.searchParams.get('client_id')).toBe('client-123');
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:1337/callback');
    expect(parsed.searchParams.get('prompt')).toBe('login');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('handles callback and exchanges code for tokens', async () => {
    OidcPlugin.install?.(app as any);
    const service = app.services['ux3.service.oidc'] as OidcService;

    const authUrl = await service.buildAuthorizationUrl();
    const state = new URL(authUrl).searchParams.get('state');
    expect(state).toBeTruthy();

    const result = await service.handleCallback(
      `http://localhost:1337/callback?code=abc123&state=${state}`
    );

    expect(result.ok).toBe(true);
    expect((globalThis as any).fetch).toHaveBeenCalled();
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getAccessToken()).toBe('access-token');
  });

  it('reads legacy oauth.cognito config shape', () => {
    const legacyApp = {
      config: {
        oauth: {
          cognito: {
            authority: 'https://cognito.example.com',
            client_id: 'legacy-client',
            redirect_uri: 'http://localhost:1337',
            scope: 'openid email',
          },
        },
      },
      services: {},
      utils: {},
    } as any;

    (OidcPlugin as any).config = { provider: 'cognito' };
    OidcPlugin.install?.(legacyApp);

    const service = legacyApp.services['ux3.service.oidc'] as OidcService;
    const cfg = service.getConfig();
    expect(cfg.provider).toBe('cognito');
    expect(cfg.clientId).toBe('legacy-client');
    expect(cfg.redirectUri).toBe('http://localhost:1337');
  });

  it('fails fast when required config is missing', () => {
    const invalidApp = {
      config: {
        plugins: {
          '@ux3/plugin-oidc': {
            provider: 'auth0',
          },
        },
      },
      services: {},
      utils: {},
    } as any;

    expect(() => {
      OidcPlugin.install?.(invalidApp);
    }).toThrow(/Missing required field\(s\): clientId, issuer\/authority or endpoints.authorize, issuer\/authority or endpoints.token/);
  });
});

describe('OIDC provider presets', () => {
  it('returns known endpoints for major providers', () => {
    const google = createProviderPreset('google');
    const okta = createProviderPreset('okta', 'https://acme.okta.com/oauth2/default');

    expect(google.authorize).toContain('accounts.google.com');
    expect(okta.token).toBe('https://acme.okta.com/oauth2/default/v1/token');
  });
});
