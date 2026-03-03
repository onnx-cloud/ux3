/**
 * Browser and device detection utilities
 * Detects browser type, device type, screen size, and capabilities
 * Only checks capabilities that don't require user permission by default
 */

// Browser type detection
export type BrowserType =
  | 'chrome'
  | 'firefox'
  | 'safari'
  | 'edge'
  | 'opera'
  | 'brave'
  | 'unknown';

// Device type detection
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// Screen size category
export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

// Browser capabilities
export interface BrowserCapabilities {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  webWorkers: boolean;
  serviceWorker: boolean;
  fetch: boolean;
  websocket: boolean;
  webGL: boolean;
  webGL2: boolean;
  canvas: boolean;
  svg: boolean;
  video: boolean;
  audio: boolean;
  geolocation: boolean;
  notification: boolean;
  vibration: boolean;
  battery: boolean;
  clipboard: boolean;
  mediaRecorder: boolean;
  paymentRequest: boolean;
  webAssembly: boolean;
  intersection: boolean;
  mutation: boolean;
  resize: boolean;
  fullscreen: boolean;
}

// Complete browser info
export interface BrowserInfo {
  browser: BrowserType;
  version: string;
  deviceType: DeviceType;
  screenSize: ScreenSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isRetina: boolean;
  isOnline: boolean;
  capabilities: BrowserCapabilities;
  userAgent: string;
  platform: string;
  language: string;
}

/**
 * Detect browser type
 */
export function detectBrowser(): { type: BrowserType; version: string } {
  const ua = navigator.userAgent;

  if (/Brave/.test(ua)) {
    return { type: 'brave', version: extractVersion(ua, /Brave\/([^\s]+)/) };
  }
  if (/Edge|Edg/.test(ua)) {
    return { type: 'edge', version: extractVersion(ua, /Edg[e|es]?\/([^\s]+)/) };
  }
  if (/Chrome|CriOS/.test(ua) && !/Edge|Edg/.test(ua)) {
    return { type: 'chrome', version: extractVersion(ua, /Chrome\/([^\s]+)/) };
  }
  if (/Firefox|FxiOS/.test(ua)) {
    return { type: 'firefox', version: extractVersion(ua, /Firefox\/([^\s]+)/) };
  }
  if (/Safari/.test(ua) && !/Chrome|CriOS|Edge|Edg/.test(ua)) {
    return { type: 'safari', version: extractVersion(ua, /Version\/([^\s]+)/) };
  }
  if (/OPR|Opera/.test(ua)) {
    return { type: 'opera', version: extractVersion(ua, /OPR\/([^\s]+)|Opera\/([^\s]+)/) };
  }

  return { type: 'unknown', version: '0.0.0' };
}

/**
 * Extract version from user agent string
 */
function extractVersion(ua: string, regex: RegExp): string {
  const match = ua.match(regex);
  return match ? match[1] || match[2] || '0.0.0' : '0.0.0';
}

/**
 * Detect device type based on user agent and screen size
 */
export function detectDeviceType(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  // Check user agent for mobile/tablet indicators
  const isMobileUA =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua);
  void isMobileUA;
  const isTabletUA = /tablet|ipad|kipling|trident/.test(ua);
  const isPhone = /mobile|iphone|android|webos|blackberry/.test(ua);

  // Use device pixel ratio as additional hint
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  // Detect tablet: iPad or screen width 600-1200px with touch
  if (isTabletUA || (width >= 600 && width <= 1200 && maxTouchPoints > 0)) {
    return 'tablet';
  }

  // Detect mobile: phone user agent or screen width < 600px
  if (isPhone || width < 600) {
    return 'mobile';
  }

  // Detect mobile by max touch points and small screen
  if (maxTouchPoints > 0 && width < 600) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Detect screen size category
 */
export function detectScreenSize(): ScreenSize {
  const width = window.innerWidth;

  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  if (width < 1536) return 'xl';

  return 'xxl';
}

/**
 * Detect browser capabilities (non-permission required)
 */
export function detectCapabilities(): BrowserCapabilities {
  return {
    localStorage: hasStorage('localStorage'),
    sessionStorage: hasStorage('sessionStorage'),
    indexedDB: hasIndexedDB(),
    webWorkers: hasWebWorkers(),
    serviceWorker: hasServiceWorker(),
    fetch: hasFetch(),
    websocket: hasWebSocket(),
    webGL: hasWebGL(false),
    webGL2: hasWebGL(true),
    canvas: hasCanvas(),
    svg: hasSVG(),
    video: hasVideo(),
    audio: hasAudio(),
    geolocation: hasGeolocation(),
    notification: hasNotification(),
    vibration: hasVibration(),
    battery: hasBattery(),
    clipboard: hasClipboard(),
    mediaRecorder: hasMediaRecorder(),
    paymentRequest: hasPaymentRequest(),
    webAssembly: hasWebAssembly(),
    intersection: hasIntersectionObserver(),
    mutation: hasMutationObserver(),
    resize: hasResizeObserver(),
    fullscreen: hasFullscreen(),
  };
}


// vendor-prefixed properties used by capability checks
interface Window {
  mozIndexedDB?: IDBFactory;
  webkitIndexedDB?: IDBFactory;
  msIndexedDB?: IDBFactory;
}

interface HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

/**
 * Check localStorage/sessionStorage support
 */
function hasStorage(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type];
    const test = '__test__';
    storage.setItem(test, test);
    storage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check IndexedDB support
 */
function hasIndexedDB(): boolean {
  return !!(
    window.indexedDB ||
    (window as any).mozIndexedDB ||
    (window as any).webkitIndexedDB ||
    (window as any).msIndexedDB
  );
}

/**
 * Check Web Workers support
 */
function hasWebWorkers(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Check Service Worker support
 */
function hasServiceWorker(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Check Fetch API support
 */
function hasFetch(): boolean {
  return typeof fetch !== 'undefined';
}

/**
 * Check WebSocket support
 */
function hasWebSocket(): boolean {
  return typeof WebSocket !== 'undefined';
}

/**
 * Check WebGL support
 */
function hasWebGL(version2: boolean = false): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext(version2 ? 'webgl2' : 'webgl');
    return !!context;
  } catch {
    return false;
  }
}

/**
 * Check Canvas support
 */
function hasCanvas(): boolean {
  const canvas = document.createElement('canvas');
  return !!(
    canvas.getContext &&
    (canvas.getContext('2d') || canvas.getContext('webgl'))
  );
}

/**
 * Check SVG support
 */
function hasSVG(): boolean {
  return !!(
    document.createElementNS &&
    document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect
  );
}

/**
 * Check Video element support
 */
function hasVideo(): boolean {
  return !!document.createElement('video').canPlayType;
}

/**
 * Check Audio element support
 */
function hasAudio(): boolean {
  return !!document.createElement('audio').canPlayType;
}

/**
 * Check Geolocation API support
 */
function hasGeolocation(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Check Notification API support
 */
function hasNotification(): boolean {
  return 'Notification' in window;
}

/**
 * Check Vibration API support
 */
function hasVibration(): boolean {
  return 'vibrate' in navigator;
}

/**
 * Check Battery Status API support
 */
function hasBattery(): boolean {
  return (
    'getBattery' in navigator ||
    'battery' in navigator ||
    'PowerManager' in window
  );
}

/**
 * Check Clipboard API support
 */
function hasClipboard(): boolean {
  return 'clipboard' in navigator && 'readText' in navigator.clipboard;
}

/**
 * Check MediaRecorder API support
 */
function hasMediaRecorder(): boolean {
  return typeof MediaRecorder !== 'undefined';
}

/**
 * Check Payment Request API support
 */
function hasPaymentRequest(): boolean {
  return 'PaymentRequest' in window;
}

/**
 * Check WebAssembly support
 */
function hasWebAssembly(): boolean {
  return typeof WebAssembly !== 'undefined';
}

/**
 * Check IntersectionObserver support
 */
function hasIntersectionObserver(): boolean {
  return 'IntersectionObserver' in window;
}

/**
 * Check MutationObserver support
 */
function hasMutationObserver(): boolean {
  return 'MutationObserver' in window;
}

/**
 * Check ResizeObserver support
 */
function hasResizeObserver(): boolean {
  return 'ResizeObserver' in window;
}

/**
 * Check Fullscreen API support
 */
function hasFullscreen(): boolean {
  const elem = document.documentElement as any;
  return !!(
    elem.requestFullscreen ||
    elem.webkitRequestFullscreen ||
    elem.mozRequestFullScreen ||
    elem.msRequestFullscreen
  );
}

/**
 * Check if display is retina (high DPI)
 */
export function isRetinDisplay(): boolean {
  return window.devicePixelRatio > 1;
}

/**
 * Get complete browser information
 */
export function getBrowserInfo(): BrowserInfo {
  const { type: browser, version } = detectBrowser();
  const deviceType = detectDeviceType();
  const screenSize = detectScreenSize();
  const capabilities = detectCapabilities();
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';
  const isRetina = isRetinDisplay();
  const isOnline = navigator.onLine;
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  // navigator.userLanguage is IE-only but TypeScript doesn't know about it
  const navLanguage = navigator.language || ((navigator as any).userLanguage as string) || '';

  return {
    browser,
    version,
    deviceType,
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
    isRetina,
    isOnline,
    capabilities,
    userAgent,
    platform,
    language: navLanguage,
  };
}

/**
 * Check if a specific capability is supported
 */
export function hasCapability(capability: keyof BrowserCapabilities): boolean {
  const capabilities = detectCapabilities();
  return capabilities[capability];
}

/**
 * Listen for online/offline changes
 */
export function onlineStatusChanged(
  callback: (isOnline: boolean) => void
): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Listen for screen size changes
 */
export function onScreenSizeChanged(
  callback: (size: ScreenSize, width: number, height: number) => void
): () => void {
  const handleResize = () => {
    const size = detectScreenSize();
    callback(size, window.innerWidth, window.innerHeight);
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}

/**
 * Get screen dimensions
 */
export function getScreenDimensions(): {
  width: number;
  height: number;
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
} {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
  };
}
