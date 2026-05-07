/**
 * UX3 Shared Configuration Defaults
 *
 * Collects previously-hardcoded magic values (ports, keys, thresholds) into
 * a single config surface so they can be overridden per-project via ux3.yaml.
 */

export const DEFAULTS = {
  /** Dev server HTTP port */
  devPort: 3000,
  /** Dev server host */
  devHost: '0.0.0.0',
  /** Hot-reload WebSocket path */
  hotReloadPath: '/__ux3_hmr',

  /** Locale storage keys */
  localeStorageKey: 'ux3-locale',
  localeCookieKey: 'ux3-locale',
  localeQueryParam: 'lang',

  /** Color scheme storage key */
  colorSchemeStorageKey: 'ux3.color.scheme',

  /** Consent persistence key prefix */
  consentStoragePrefix: 'ux3.consent',

  /** Dev tools event buffer max size */
  devToolsMaxEvents: 500,

  /** Inspector default panel */
  inspectorDefaultPanel: 'fsm',

  /** Browser context debounce (ms) */
  browserContextDebounceMs: 120,

  /** Default locale */
  defaultLocale: 'en-US',

  /** Content directory within projects */
  contentDir: 'content',

  /** i18n default namespace */
  i18nDefaultNamespace: 'en',

  /** Scaffold interpolation tokens */
  scaffoldTokenPattern: /\[\[\s*([\w.]+)\s*\]\]/g,

  /** Template file extensions for view compiler */
  viewCompilerExtensions: ['.yaml', '.yml'],
} as const;
