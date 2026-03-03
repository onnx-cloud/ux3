/**
 * Browser State Types
 *
 * Detectable browser and device capabilities injected by plugin-browser
 */

export type BrowserName = 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'ie' | 'unknown';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type OSType = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';

export interface BrowserInfo {
  /** Browser name (chrome, firefox, safari, edge, opera, ie, unknown) */
  name: BrowserName;
  /** Browser version (e.g., "120.0.0") */
  version: string;
  /** User agent string */
  userAgent: string;
}

export interface OSInfo {
  /** Operating system (windows, macos, linux, ios, android, unknown) */
  type: OSType;
  /** OS version string (e.g., "10", "Ventura") */
  version: string;
}

export interface DeviceInfo {
  /** Device type classification */
  type: DeviceType;
  /** Is touch-capable device */
  isTouchable: boolean;
  /** Screen width in pixels */
  screenWidth: number;
  /** Screen height in pixels */
  screenHeight: number;
  /** Device pixel ratio (e.g., 2 for retina) */
  pixelRatio: number;
  /** Approximate screen diagonal size for categorization */
  screenSize?: number;
}

export interface LocaleInfo {
  /** Primary language code (e.g., 'en', 'fr', 'de') */
  language: string;
  /** Full locale string (e.g., 'en-US', 'fr-FR') */
  locale: string;
  /** All available languages from navigator.languages */
  languages: string[];
  /** Browser's timezone offset in minutes */
  timezoneOffset: number;
  /** Browser's timezone name (e.g., 'America/New_York') via Intl API */
  timezone?: string;
}

export interface PreferencesInfo {
  /** Dark mode preference (true = dark, false = light, null = no preference) */
  isDarkMode: boolean | null;
  /** Reduced motion preference */
  prefersReducedMotion: boolean;
  /** Reduced transparency preference */
  prefersReducedTransparency: boolean;
  /** High contrast mode */
  prefersHighContrast: boolean;
  /** Color scheme preference ('dark' | 'light' | null) */
  colorScheme: string | null;
}

export interface ConnectivityInfo {
  /** Is device online */
  isOnline: boolean;
  /** Effective connection type (if available via Network Information API) */
  connectionType?: string;
  /** Effective bandwidth (Mbps, if available) */
  effectiveBandwidth?: number;
  /** Estimated RTT (milliseconds, if available) */
  rtt?: number;
  /** Data saver mode enabled */
  saveData?: boolean;
}

export interface BrowserState {
  browser: BrowserInfo;
  os: OSInfo;
  device: DeviceInfo;
  locale: LocaleInfo;
  preferences: PreferencesInfo;
  connectivity: ConnectivityInfo;
}

export interface BrowserPluginConfig {
  /** Whether to inject state into app.ui.browser (default: true) */
  injectToUI?: boolean;
  /** Whether to track online/offline changes (default: true) */
  trackConnectivity?: boolean;
  /** Callback when browser state changes */
  onChange?: (state: BrowserState) => void;
}
