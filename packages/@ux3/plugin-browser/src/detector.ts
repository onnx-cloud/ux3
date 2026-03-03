/**
 * Browser Detection and State Gathering
 *
 * Detects browser capabilities, device info, locale, preferences, and connectivity
 */

import type {
  BrowserState,
  BrowserInfo,
  OSInfo,
  DeviceInfo,
  LocaleInfo,
  PreferencesInfo,
  ConnectivityInfo,
} from './types.js';

/**
 * Detect browser name and version from user agent
 */
export function detectBrowser(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''): BrowserInfo {
  let name: any = 'unknown';
  let version = 'unknown';

  // Order matters - check more specific patterns first
  if (/edge/i.test(userAgent)) {
    name = 'edge';
    const match = userAgent.match(/edge\/(\d+(\.\d+)*)/i);
    version = match ? match[1] : 'unknown';
  } else if (/chrome/i.test(userAgent) && !/chromium/i.test(userAgent)) {
    name = 'chrome';
    const match = userAgent.match(/chrome\/(\d+(\.\d+)*)/i);
    version = match ? match[1] : 'unknown';
  } else if (/firefox/i.test(userAgent)) {
    name = 'firefox';
    const match = userAgent.match(/firefox\/(\d+(\.\d+)*)/i);
    version = match ? match[1] : 'unknown';
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    name = 'safari';
    const match = userAgent.match(/version\/(\d+(\.\d+)*)/i);
    version = match ? match[1] : 'unknown';
  } else if (/opr/i.test(userAgent) || /opera/i.test(userAgent)) {
    name = 'opera';
    const match = userAgent.match(/(?:opr|opera)\/(\d+(\.\d+)*)/i);
    version = match ? match[1] : 'unknown';
  } else if (/trident/i.test(userAgent)) {
    name = 'ie';
    const match = userAgent.match(/rv:(\d+(\.\d+)*)/);
    version = match ? match[1] : 'unknown';
  }

  return {
    name: name as any,
    version,
    userAgent,
  };
}

/**
 * Detect operating system
 */
export function detectOS(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''): OSInfo {
  let type: any = 'unknown';
  let version = 'unknown';

  if (/windows|win32/i.test(userAgent)) {
    type = 'windows';
    if (/windows nt 10\.0|win10/i.test(userAgent)) version = '10';
    else if (/windows nt 6\.3|win8\.1/i.test(userAgent)) version = '8.1';
    else if (/windows nt 6\.2|win8/i.test(userAgent)) version = '8';
    else {
      const match = userAgent.match(/windows nt ([\d.]+)/i);
      version = match ? match[1] : 'unknown';
    }
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    type = 'macos';
    const match = userAgent.match(/mac os x ([\d_]+)/i);
    if (match) {
      version = match[1].replace(/_/g, '.');
    } else {
      version = 'unknown';
    }
  } else if (/linux/i.test(userAgent)) {
    type = 'linux';
    version = 'unknown';
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    type = 'ios';
    const match = userAgent.match(/os ([\d_]+)/i);
    version = match ? match[1].replace(/_/g, '.') : 'unknown';
  } else if (/android/i.test(userAgent)) {
    type = 'android';
    const match = userAgent.match(/android ([\d.]+)/i);
    version = match ? match[1] : 'unknown';
  }

  return { type, version };
}

/**
 * Detect device type based on user agent and screen size
 */
export function detectDevice(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''): DeviceInfo {
  // Detect mobile/tablet first via user agent
  const isMobileUA = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
  const isTabletUA = /ipad|android(?!.*(mobile|phone))/i.test(userAgent);

  // Get screen info
  const screenWidth = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 0;
  const screenHeight = typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 0;
  const pixelRatio = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;

  // Touch capability
  const isTouchable =
    typeof window !== 'undefined' &&
    (!!('ontouchstart' in window) ||
      !!(navigator as any).maxTouchPoints ||
      !!(navigator as any).msMaxTouchPoints);

  // Device classification: use screen width as primary factor, UA as secondary
  let type: any = 'desktop';
  if (isMobileUA && !isTabletUA) {
    type = 'mobile';
  } else if (isTabletUA || screenWidth < 1024) {
    type = 'tablet';
  } else if (screenWidth >= 1024) {
    type = 'desktop';
  }

  // Screen size approximation (diagonal in inches, assuming 96 DPI)
  let screenSize: number | undefined;
  if (screenWidth > 0 && screenHeight > 0) {
    const diagonal = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);
    screenSize = Math.round(diagonal / 96); // inches at 96 DPI
  }

  return {
    type,
    isTouchable,
    screenWidth,
    screenHeight,
    pixelRatio,
    screenSize,
  };
}

/**
 * Detect locale and language information
 */
export function detectLocale(
  language = typeof navigator !== 'undefined' ? navigator.language : 'en-US'
): LocaleInfo {
  const locale = language;
  const languageCode = locale.split('-')[0];

  const languages = typeof navigator !== 'undefined' && (navigator as any).languages 
    ? Array.from((navigator as any).languages)
    : [language];

  const timezoneOffset = new Date().getTimezoneOffset();

  // Try to get timezone name via Intl API
  let timezone: string | undefined;
  try {
    timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Intl API not available or error
  }

  return {
    language: languageCode,
    locale,
    languages: languages as string[],
    timezoneOffset,
    timezone,
  };
}

/**
 * Detect user preferences (dark mode, reduced motion, etc.)
 */
export function detectPreferences(): PreferencesInfo {
  let isDarkMode: boolean | null = null;
  let prefersReducedMotion = false;
  let prefersReducedTransparency = false;
  let prefersHighContrast = false;
  let colorScheme: string | null = null;

  if (typeof window !== 'undefined') {
    // Dark mode
    const darkModeQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (darkModeQuery) {
      isDarkMode = darkModeQuery.matches;
      colorScheme = darkModeQuery.matches ? 'dark' : 'light';
    }

    // Reduced motion
    const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery) {
      prefersReducedMotion = reducedMotionQuery.matches;
    }

    // Reduced transparency
    const reducedTransparencyQuery = window.matchMedia?.('(prefers-reduced-transparency: reduce)');
    if (reducedTransparencyQuery) {
      prefersReducedTransparency = reducedTransparencyQuery.matches;
    }

    // High contrast
    const highContrastQuery = window.matchMedia?.('(prefers-contrast: more)');
    if (highContrastQuery) {
      prefersHighContrast = highContrastQuery.matches;
    }
  }

  return {
    isDarkMode,
    prefersReducedMotion,
    prefersReducedTransparency,
    prefersHighContrast,
    colorScheme,
  };
}

/**
 * Detect connectivity information
 */
export function detectConnectivity(): ConnectivityInfo {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  let connectionType: string | undefined;
  let effectiveBandwidth: number | undefined;
  let rtt: number | undefined;
  let saveData: boolean | undefined;

  if (typeof navigator !== 'undefined') {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      connectionType = conn.effectiveType; // '4g', '3g', '2g', 'slow-2g'
      effectiveBandwidth = conn.downlinkMax ? conn.downlinkMax : undefined;
      rtt = conn.rtt ? conn.rtt : undefined;
      saveData = conn.saveData ? conn.saveData : undefined;
    }
  }

  return {
    isOnline,
    connectionType,
    effectiveBandwidth,
    rtt,
    saveData,
  };
}

/**
 * Gather all browser state
 */
export function gatherBrowserState(): BrowserState {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  return {
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    device: detectDevice(userAgent),
    locale: detectLocale(typeof navigator !== 'undefined' ? navigator.language : 'en-US'),
    preferences: detectPreferences(),
    connectivity: detectConnectivity(),
  };
}
