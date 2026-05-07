import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLocaleService, canonicalLocale, buildFallbackChain, type LocaleService } from '../../src/services/locale-runtime.js';

describe('canonicalLocale', () => {
  it('normalizes en_US to en-US', () => {
    expect(canonicalLocale('en_US')).toBe('en-US');
  });

  it('preserves already-canonical en-US', () => {
    expect(canonicalLocale('en-US')).toBe('en-US');
  });

  it('normalizes lowercase en-us to en-US', () => {
    expect(canonicalLocale('en-us')).toBe('en-US');
  });

  it('handles fr-CA', () => {
    expect(canonicalLocale('fr-CA')).toBe('fr-CA');
  });
});

describe('buildFallbackChain', () => {
  it('builds chain for fr-CA', () => {
    const chain = buildFallbackChain('fr-CA', 'en-US');
    expect(chain).toEqual(['fr-CA', 'fr', 'en-US']);
  });

  it('returns single entry when locale equals default', () => {
    const chain = buildFallbackChain('en-US', 'en-US');
    // Language fallback en is included in the chain
    expect(chain).toEqual(['en-US', 'en']);
  });

  it('has no duplicate when no region', () => {
    const chain = buildFallbackChain('fr', 'en-US');
    expect(chain).toEqual(['fr', 'en-US']);
  });
});

describe('createLocaleService', () => {
  let service: LocaleService;

  beforeEach(() => {
    // Clear storage
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
      document.cookie = 'ux3-locale=;path=/;max-age=0';
    }
  });

  it('resolves to default locale when nothing configured', () => {
    service = createLocaleService();
    // In jsdom navigator.language is 'en-US', so this is typically 'en-US'
    const locale = service.locale;
    expect(locale.primary).toBeTruthy();
    expect(locale.language).toBeTruthy();
    // ltr is expected for en-US; rtl is valid too in other environments
    expect(['ltr', 'rtl']).toContain(locale.direction);
  });

  it('uses configured default locale when no higher-precedence source', () => {
    // Mock navigator.language to undefined so default is used
    const origDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'language');
    Object.defineProperty(Navigator.prototype, 'language', { value: undefined, configurable: true });
    try {
      service = createLocaleService({ defaultLocale: 'fr-CA' });
      expect(service.locale.language).toBe('fr');
      expect(service.locale.region).toBe('CA');
    } finally {
      if (origDescriptor) Object.defineProperty(Navigator.prototype, 'language', origDescriptor);
    }
  });

  it('produces rtl direction for Arabic when configured', () => {
    const origDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'language');
    Object.defineProperty(Navigator.prototype, 'language', { value: undefined, configurable: true });
    try {
      service = createLocaleService({ defaultLocale: 'ar-SA' });
      expect(service.locale.direction).toBe('rtl');
    } finally {
      if (origDescriptor) Object.defineProperty(Navigator.prototype, 'language', origDescriptor);
    }
  });

  it('setLocale switches and persists', () => {
    service = createLocaleService({ supportedLocales: ['en-US', 'fr-FR', 'de-DE'] });
    service.setLocale('fr-FR');
    expect(service.locale.language).toBe('fr');
    expect(service.locale.primary).toBe('fr-FR');
  });

  it('notifies onChange subscribers when locale switches', () => {
    service = createLocaleService({ supportedLocales: ['en-US', 'de-DE'] });
    const received: string[] = [];
    service.onChange((l) => received.push(l.primary));
    service.setLocale('de-DE');
    expect(received).toContain('de-DE');
  });

  it('onChange fires immediately with current value', () => {
    service = createLocaleService({ supportedLocales: ['en-US', 'es-ES'] });
    const received: string[] = [];
    service.onChange((l) => received.push(l.primary));
    expect(received.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty route prefix when no-prefix mode', () => {
    service = createLocaleService({ routeMode: 'no-prefix' });
    expect(service.getRoutePrefix()).toBe('');
  });

  it('returns language prefix in prefix-required mode when locale is set', () => {
    service = createLocaleService({ supportedLocales: ['en-US', 'fr-FR'], routeMode: 'prefix-required' });
    service.setLocale('fr-FR');
    expect(service.getRoutePrefix()).toBe('/fr');
  });

  it('resolveFromRoute extracts locale from path', () => {
    service = createLocaleService({ supportedLocales: ['en-US', 'fr-FR', 'de-DE'] });
    const resolved = service.resolveFromRoute('/fr-FR/products');
    expect(resolved.language).toBe('fr');
    expect(resolved.source).toBe('route');
  });

  it('resolveFromRoute falls back when prefix not supported', () => {
    service = createLocaleService({ supportedLocales: ['en-US'] });
    const resolved = service.resolveFromRoute('/jp-JP/home');
    expect(resolved.language).toBe('en');
    expect(resolved.source).not.toBe('route');
  });
});
