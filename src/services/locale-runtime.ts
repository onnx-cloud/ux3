/**
 * Locale Runtime Service
 *
 * First-class dynamic locale resolution with precedence chain, canonical
 * normalization, fallback chain, and runtime switching with persistence
 * and route-sync behavior.
 *
 * SPEC: Precedence-driven locale resolution (route, query, cookie, storage,
 * navigator, default), canonical locale normalization (en_US -> en-US),
 * fallback chain resolution (fr-CA -> fr -> default), runtime switching
 * without app restart.
 */

import { DEFAULTS } from '../config/defaults.js';

const STORAGE_KEY = DEFAULTS.localeStorageKey;
const COOKIE_KEY = DEFAULTS.localeCookieKey;
const DEFAULT_LOCALE = DEFAULTS.defaultLocale;

const RTL_LANGS = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'sd', 'ug', 'yi']);

type RouteMode = 'prefix-required' | 'prefix-optional' | 'no-prefix';

export interface LocaleServiceConfig {
  defaultLocale?: string;
  supportedLocales?: string[];
  routeMode?: RouteMode;
}

export interface LocaleInfo {
  /** Canonical BCP-47 tag (e.g. 'en-US', 'fr-CA') */
  primary: string;
  /** ISO 639-1 language code */
  language: string;
  /** ISO 3166-1 region code (optional) */
  region?: string;
  /** Ordered list of user-preferred locales */
  preferred: string[];
  /** Text direction */
  direction: 'ltr' | 'rtl';
  /** Source of the resolved locale */
  source: LocaleSource;
  /** Fallback chain [specific, generic, default] */
  fallbackChain: string[];
}

export type LocaleSource = 'route' | 'query' | 'cookie' | 'storage' | 'navigator' | 'default';

export interface LocaleService {
  /** Current resolved locale info */
  readonly locale: LocaleInfo;
  /** All supported locale tags */
  readonly supportedLocales: string[];
  /** Resolve locale without persistence (for retrieval) */
  resolve(): LocaleInfo;
  /** Switch locale and persist (cookie + storage + html lang + reactive emit) */
  setLocale(locale: string): void;
  /** Subscribe to locale changes */
  onChange(handler: (locale: LocaleInfo) => void): () => void;
  /** Get navigation prefix for current locale in prefix mode */
  getRoutePrefix(): string;
  /** Route-mode aware resolve from a given pathname */
  resolveFromRoute(pathname: string): LocaleInfo;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
}

function readStorage(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function writeStorage(value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // storage not available
  }
}

/** Canonicalize locale: en_US -> en-US, en-us -> en-US */
export function canonicalLocale(input: string): string {
  // Normalize underscores to hyphens first (some APIs return en_US)
  const normalized = input.replace(/_/g, '-');
  try {
    return Intl.getCanonicalLocales(normalized)[0] || input;
  } catch {
    return normalized;
  }
}

function parseLocale(locale: string): { language: string; region?: string } {
  const [language, region] = locale.split('-');
  return { language: (language || 'en').toLowerCase(), region: region?.toUpperCase() };
}

function directionForLanguage(language: string): 'ltr' | 'rtl' {
  return RTL_LANGS.has(language) ? 'rtl' : 'ltr';
}

/** Build fallback chain: fr-CA -> fr -> default */
export function buildFallbackChain(locale: string, defaultLocale: string): string[] {
  const seen = new Set<string>();
  const chain: string[] = [];

  // Add the locale itself
  chain.push(locale);
  seen.add(locale);

  // Add language-only fallback if locale has a region
  const parts = locale.split('-');
  if (parts.length > 1 && !seen.has(parts[0])) {
    chain.push(parts[0]);
    seen.add(parts[0]);
  }

  // Add default if not already covered
  if (!seen.has(defaultLocale)) {
    chain.push(defaultLocale);
  }

  return chain;
}

export function createLocaleService(config: LocaleServiceConfig = {}): LocaleService {
  const defaultLocale = config.defaultLocale || DEFAULT_LOCALE;
  const supportedLocales = config.supportedLocales || [defaultLocale];
  const routeMode: RouteMode = config.routeMode || 'no-prefix';

  const handlers = new Set<(locale: LocaleInfo) => void>();
  let current: LocaleInfo | null = null;

  function notify(): void {
    if (!current) return;
    for (const handler of handlers) {
      try { handler(current); } catch { /* noop */ }
    }
  }

  function buildLocaleInfo(tag: string, source: LocaleSource): LocaleInfo {
    const primary = canonicalLocale(tag);
    const { language, region } = parseLocale(primary);

    // Only restrict to supportedLocales when a whitelist is explicitly provided.
    let preferredTag = primary;
    if (supportedLocales.length > 1 || !supportedLocales.includes(defaultLocale)) {
      if (!supportedLocales.includes(primary)) {
        const langMatch = supportedLocales.find((l) => l.startsWith(language));
        preferredTag = langMatch || defaultLocale;
      }
    }

    return {
      primary: preferredTag,
      language,
      region,
      preferred: [preferredTag],
      direction: directionForLanguage(language),
      source,
      fallbackChain: buildFallbackChain(preferredTag, defaultLocale),
    };
  }

  function resolveFromQuery(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('lang') || undefined;
    } catch {
      return undefined;
    }
  }

  function resolve(): LocaleInfo {
    // 1. Route param (handled via resolveFromRoute)
    // 2. Query string
    const q = resolveFromQuery();
    if (q) return buildLocaleInfo(q, 'query');

    // 3. Cookie
    const c = readCookie(COOKIE_KEY);
    if (c) return buildLocaleInfo(c, 'cookie');

    // 4. localStorage
    const s = readStorage();
    if (s) return buildLocaleInfo(s, 'storage');

    // 5. Navigator
    if (typeof navigator !== 'undefined' && navigator.language) {
      return buildLocaleInfo(navigator.language, 'navigator');
    }

    // 6. Default
    return buildLocaleInfo(defaultLocale, 'default');
  }

  function setLocale(tag: string): void {
    const info = buildLocaleInfo(tag, 'storage');

    // Persist
    writeCookie(COOKIE_KEY, info.primary);
    writeStorage(info.primary);

    // Update <html lang>
    if (typeof document !== 'undefined') {
      document.documentElement.lang = info.language;
      document.documentElement.dir = info.direction;
    }

    current = info;
    notify();
  }

  function getRoutePrefix(): string {
    if (routeMode === 'no-prefix' || !current) return '';
    return `/${current.language}`;
  }

  function resolveFromRoute(pathname: string): LocaleInfo {
    // Try to extract locale from route prefix
    const routePrefix = pathname.match(/^\/([a-z]{2}(-[A-Z]{2})?)(\/|$)/);
    if (routePrefix) {
      const tag = canonicalLocale(routePrefix[1]);
      if (supportedLocales.includes(tag) || supportedLocales.some((l) => l.startsWith(tag.split('-')[0]))) {
        return buildLocaleInfo(tag, 'route');
      }
    }
    // Fall back to full resolution
    return resolve();
  }

  // Initialize
  current = resolve();

  return {
    get locale(): LocaleInfo {
      if (!current) current = resolve();
      return current;
    },

    get supportedLocales(): string[] {
      return supportedLocales;
    },

    resolve,
    setLocale,

    onChange(handler: (locale: LocaleInfo) => void): () => void {
      handlers.add(handler);
      // Fire immediately with current value
      if (current) handler(current);
      return () => { handlers.delete(handler); };
    },

    getRoutePrefix,
    resolveFromRoute,
  };
}
