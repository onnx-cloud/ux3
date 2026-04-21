export type Reliability = 'high' | 'medium' | 'low';

export interface BrowserContext {
  capturedAt: string;
  locale: {
    primary: string;
    language: string;
    region?: string;
    preferred: string[];
    direction: 'ltr' | 'rtl';
    reliability: Reliability;
  };
  datetime: {
    timeZone?: string;
    offsetMinutes: number;
    localeCalendar?: string;
    localeNumberingSystem?: string;
    hourCycle?: 'h11' | 'h12' | 'h23' | 'h24';
    reliability: Reliability;
  };
  userAgent: {
    platform?: string;
    mobile?: boolean;
    brands?: Array<{ brand: string; version: string }>;
    architecture?: string;
    bitness?: string;
    model?: string;
    fullUA?: string;
    reliability: Reliability;
  };
  display: {
    viewport: { width: number; height: number };
    screen: { width: number; height: number; availWidth?: number; availHeight?: number };
    devicePixelRatio: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    orientation?: 'portrait' | 'landscape';
    colorScheme: 'light' | 'dark' | 'no-preference';
    contrast: 'more' | 'less' | 'no-preference' | 'custom';
    reducedMotion: boolean;
    reducedTransparency?: boolean;
    forcedColors?: boolean;
    reliability: Reliability;
  };
  input: {
    pointer: 'none' | 'coarse' | 'fine' | 'mixed';
    hover: boolean;
    touchPoints: number;
    keyboardLikely: boolean;
    reliability: Reliability;
  };
  connectivity: {
    online: boolean;
    effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
    downlinkMbps?: number;
    rttMs?: number;
    saveData?: boolean;
    reliability: Reliability;
  };
  capabilities: {
    cookiesEnabled?: boolean;
    localStorage?: boolean;
    sessionStorage?: boolean;
    serviceWorker?: boolean;
    webGL?: boolean;
    wasm?: boolean;
    notificationsPermission?: 'granted' | 'denied' | 'prompt' | 'unknown';
    reliability: Reliability;
  };
  sources: Record<string, string>;
}

export interface BrowserContextOptions {
  enableHighEntropyUA?: boolean;
  observeChanges?: boolean;
  now?: () => Date;
  debounceMs?: number;
}

const RTL_LANGS = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'sd', 'ug', 'yi']);

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

function canonicalLocale(input: string | undefined): string {
  if (!input) {
    return 'en-US';
  }

  try {
    return Intl.getCanonicalLocales(input)[0] || input;
  } catch {
    return input;
  }
}

function parseLocale(locale: string): { language: string; region?: string } {
  const [language, region] = locale.split('-');
  return { language: (language || 'en').toLowerCase(), region: region?.toUpperCase() };
}

function directionForLanguage(language: string): 'ltr' | 'rtl' {
  return RTL_LANGS.has(language) ? 'rtl' : 'ltr';
}

function matchMediaQuery(query: string): MediaQueryList | null {
  if (!isBrowser() || typeof window.matchMedia !== 'function') {
    return null;
  }

  try {
    return window.matchMedia(query);
  } catch {
    return null;
  }
}

function canUseStorage(type: 'localStorage' | 'sessionStorage'): boolean {
  if (!isBrowser()) {
    return false;
  }

  try {
    const key = '__ux3_browser_ctx_probe__';
    const storage = window[type];
    storage.setItem(key, '1');
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function hasWebGLSupport(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

function displaySize(width: number): 'sm' | 'md' | 'lg' | 'xl' {
  if (width < 640) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1440) return 'lg';
  return 'xl';
}

function snapshotComparable(context: BrowserContext): Omit<BrowserContext, 'capturedAt'> {
  const { capturedAt: _capturedAt, ...rest } = context;
  return rest;
}

export function captureBrowserContext(options: BrowserContextOptions = {}): BrowserContext {
  const now = options.now ?? (() => new Date());
  const capturedAt = now().toISOString();

  const fallback: BrowserContext = {
    capturedAt,
    locale: {
      primary: 'en-US',
      language: 'en',
      preferred: ['en-US'],
      direction: 'ltr',
      reliability: 'low',
    },
    datetime: {
      offsetMinutes: now().getTimezoneOffset(),
      reliability: 'low',
    },
    userAgent: {
      reliability: 'low',
    },
    display: {
      viewport: { width: 0, height: 0 },
      screen: { width: 0, height: 0 },
      devicePixelRatio: 1,
      colorScheme: 'no-preference',
      contrast: 'no-preference',
      reducedMotion: false,
      reliability: 'low',
    },
    input: {
      pointer: 'none',
      hover: false,
      touchPoints: 0,
      keyboardLikely: false,
      reliability: 'low',
    },
    connectivity: {
      online: true,
      reliability: 'low',
    },
    capabilities: {
      reliability: 'low',
    },
    sources: {
      locale: 'default',
      datetime: 'default',
      userAgent: 'default',
      display: 'default',
      input: 'default',
      connectivity: 'default',
      capabilities: 'default',
    },
  };

  if (!isBrowser()) {
    return fallback;
  }

  const primaryLocale = canonicalLocale(navigator.language);
  const preferredLocales = Array.isArray((navigator as any).languages)
    ? (navigator as any).languages.map((value: string) => canonicalLocale(value))
    : [primaryLocale];
  const localeParts = parseLocale(primaryLocale);

  const dtfOptions = (() => {
    try {
      return new Intl.DateTimeFormat().resolvedOptions();
    } catch {
      return {} as Intl.ResolvedDateTimeFormatOptions;
    }
  })();

  const uaData = (navigator as any).userAgentData;
  const pointerFine = !!matchMediaQuery('(pointer: fine)')?.matches;
  const pointerCoarse = !!matchMediaQuery('(pointer: coarse)')?.matches;
  const anyPointerFine = !!matchMediaQuery('(any-pointer: fine)')?.matches;
  const anyPointerCoarse = !!matchMediaQuery('(any-pointer: coarse)')?.matches;

  let pointer: BrowserContext['input']['pointer'] = 'none';
  if ((pointerFine && anyPointerCoarse) || (pointerCoarse && anyPointerFine)) {
    pointer = 'mixed';
  } else if (pointerFine || anyPointerFine) {
    pointer = 'fine';
  } else if (pointerCoarse || anyPointerCoarse) {
    pointer = 'coarse';
  }

  const prefersDark = !!matchMediaQuery('(prefers-color-scheme: dark)')?.matches;
  const prefersLight = !!matchMediaQuery('(prefers-color-scheme: light)')?.matches;
  const prefersContrastMore = !!matchMediaQuery('(prefers-contrast: more)')?.matches;
  const prefersContrastLess = !!matchMediaQuery('(prefers-contrast: less)')?.matches;
  const prefersReducedMotion = !!matchMediaQuery('(prefers-reduced-motion: reduce)')?.matches;
  const prefersReducedTransparency = !!matchMediaQuery('(prefers-reduced-transparency: reduce)')?.matches;
  const forcedColors = !!matchMediaQuery('(forced-colors: active)')?.matches;

  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

  const context: BrowserContext = {
    capturedAt,
    locale: {
      primary: primaryLocale,
      language: localeParts.language,
      region: localeParts.region,
      preferred: preferredLocales.length > 0 ? preferredLocales : [primaryLocale],
      direction: directionForLanguage(localeParts.language),
      reliability: 'high',
    },
    datetime: {
      timeZone: dtfOptions.timeZone,
      offsetMinutes: now().getTimezoneOffset(),
      localeCalendar: dtfOptions.calendar,
      localeNumberingSystem: dtfOptions.numberingSystem,
      hourCycle: dtfOptions.hourCycle,
      reliability: dtfOptions.timeZone ? 'high' : 'medium',
    },
    userAgent: {
      platform: navigator.platform || undefined,
      mobile: typeof uaData?.mobile === 'boolean' ? uaData.mobile : undefined,
      brands: Array.isArray(uaData?.brands) ? uaData.brands : undefined,
      architecture: undefined,
      bitness: undefined,
      model: undefined,
      fullUA: options.enableHighEntropyUA ? navigator.userAgent : undefined,
      reliability: uaData ? 'high' : 'medium',
    },
    display: {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      screen: {
        width: window.screen?.width ?? window.innerWidth,
        height: window.screen?.height ?? window.innerHeight,
        availWidth: window.screen?.availWidth,
        availHeight: window.screen?.availHeight,
      },
      devicePixelRatio: window.devicePixelRatio || 1,
      size: displaySize(window.innerWidth),
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      colorScheme: prefersDark ? 'dark' : prefersLight ? 'light' : 'no-preference',
      contrast: forcedColors
        ? 'custom'
        : prefersContrastMore
          ? 'more'
          : prefersContrastLess
            ? 'less'
            : 'no-preference',
      reducedMotion: prefersReducedMotion,
      reducedTransparency: prefersReducedTransparency,
      forcedColors,
      reliability: 'high',
    },
    input: {
      pointer,
      hover: !!(matchMediaQuery('(hover: hover)')?.matches || matchMediaQuery('(any-hover: hover)')?.matches),
      touchPoints: navigator.maxTouchPoints || 0,
      keyboardLikely: pointer === 'fine' || pointer === 'mixed',
      reliability: 'high',
    },
    connectivity: {
      online: navigator.onLine,
      effectiveType: conn?.effectiveType,
      downlinkMbps: conn?.downlink,
      rttMs: conn?.rtt,
      saveData: conn?.saveData,
      reliability: conn ? 'medium' : 'high',
    },
    capabilities: {
      cookiesEnabled: navigator.cookieEnabled,
      localStorage: canUseStorage('localStorage'),
      sessionStorage: canUseStorage('sessionStorage'),
      serviceWorker: 'serviceWorker' in navigator,
      webGL: hasWebGLSupport(),
      wasm: typeof WebAssembly !== 'undefined',
      notificationsPermission:
        typeof Notification === 'undefined' ? 'unknown' : Notification.permission,
      reliability: 'medium',
    },
    sources: {
      locale: 'navigator.language,navigator.languages,Intl.DateTimeFormat().resolvedOptions().locale',
      datetime: 'Intl.DateTimeFormat().resolvedOptions(),Date.getTimezoneOffset',
      userAgent: 'navigator.userAgentData,navigator.platform',
      display: 'window.innerWidth,window.screen,window.devicePixelRatio,matchMedia',
      input: 'matchMedia(pointer/hover),navigator.maxTouchPoints',
      connectivity: 'navigator.onLine,navigator.connection',
      capabilities: 'navigator,window,document probes',
    },
  };

  return context;
}

export function observeBrowserContext(
  onChange: (context: BrowserContext) => void,
  options: BrowserContextOptions = {}
): () => void {
  if (!isBrowser()) {
    return () => undefined;
  }

  if (options.observeChanges === false) {
    return () => undefined;
  }

  const debounceMs = options.debounceMs ?? 120;
  const mediaQueries = [
    '(prefers-color-scheme: dark)',
    '(prefers-color-scheme: light)',
    '(prefers-contrast: more)',
    '(prefers-contrast: less)',
    '(prefers-reduced-motion: reduce)',
    '(prefers-reduced-transparency: reduce)',
    '(forced-colors: active)',
    '(pointer: coarse)',
    '(pointer: fine)',
    '(any-pointer: coarse)',
    '(any-pointer: fine)',
    '(hover: hover)',
    '(any-hover: hover)',
  ];

  let timeout: ReturnType<typeof setTimeout> | null = null;
  let current = captureBrowserContext(options);

  const maybeEmit = () => {
    const next = captureBrowserContext(options);
    if (JSON.stringify(snapshotComparable(next)) === JSON.stringify(snapshotComparable(current))) {
      return;
    }

    current = next;
    onChange(next);
  };

  const scheduleEmit = () => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      maybeEmit();
    }, debounceMs);
  };

  const listeners: Array<() => void> = [];
  const addWindowListener = (eventName: string) => {
    const handler = () => scheduleEmit();
    window.addEventListener(eventName, handler);
    listeners.push(() => window.removeEventListener(eventName, handler));
  };

  addWindowListener('resize');
  addWindowListener('orientationchange');
  addWindowListener('online');
  addWindowListener('offline');
  addWindowListener('languagechange');

  for (const query of mediaQueries) {
    const mql = matchMediaQuery(query);
    if (!mql) {
      continue;
    }

    const handler = () => scheduleEmit();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
      listeners.push(() => mql.removeEventListener('change', handler));
    } else if (typeof (mql as any).addListener === 'function') {
      (mql as any).addListener(handler);
      listeners.push(() => (mql as any).removeListener(handler));
    }
  }

  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (conn && typeof conn.addEventListener === 'function') {
    const connectionHandler = () => scheduleEmit();
    conn.addEventListener('change', connectionHandler);
    listeners.push(() => conn.removeEventListener('change', connectionHandler));
  }

  return () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }

    for (const dispose of listeners) {
      dispose();
    }
  };
}
