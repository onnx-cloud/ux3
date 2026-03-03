# @ux3/plugin-browser

Browser detection and state injection plugin for UX3. Automatically detects and injects browser capabilities, device information, locale, preferences, and connectivity status into the app context.

## Features

- **Browser Detection** — Detects browser name, version, and user agent
- **OS Detection** — Identifies Windows, macOS, Linux, iOS, Android
- **Device Classification** — Determines mobile, tablet, or desktop
- **Locale & Language** — Captures language preferences and timezone
- **User Preferences** — Detects dark mode, reduced motion, contrast preferences
- **Connectivity Status** — Monitors online/offline status and connection type
- **Zero Configuration** — Works out-of-the-box with sensible defaults
- **Live Updates** — Tracks changes to online/offline status, preferences (with media query listeners)

## Installation

```bash
npm install @ux3/plugin-browser
```

## Basic Usage

### 1. Register the plugin

In your app initialization or `ux3.config.json`:

```javascript
import BrowserPlugin from '@ux3/plugin-browser';

const app = initializeApp({
  plugins: [BrowserPlugin],
});
```

Or in YAML:

```yaml
plugins:
  '@ux3/plugin-browser':
    injectToUI: true
    trackConnectivity: true
```

### 2. Access browser state in templates or FSMs

The plugin injects state into `app.ui.browser`:

```html
<!-- In a template -->
<div class="device-info">
  {{ui.browser.device.type}}
  {{ui.browser.browser.name}}
  {{ui.browser.locale.language}}
</div>

<div *ux-if="ui.browser.device.isTouchable">
  Touch is supported
</div>
```

### 3. Use utilities in FSM logic

```typescript
// In an FSM guard
if (app.utils.hasCapability('mobile')) {
  // Mobile-specific logic
}

// Get full browser state
const state = app.utils.getBrowserState();
console.log(state.preferences.isDarkMode);
console.log(state.connectivity.isOnline);
```

## Configuration

```javascript
{
  plugins: {
    '@ux3/plugin-browser': {
      // Inject state into app.ui.browser (default: true)
      injectToUI: true,
      
      // Track and update online/offline changes (default: true)
      trackConnectivity: true,
      
      // Optional callback for state changes
      onChange: (state) => {
        console.log('Browser state changed:', state);
      }
    }
  }
}
```

## API

### `app.ui.browser` (when `injectToUI: true`)

The entire browser state object:

```typescript
{
  browser: {
    name: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'ie' | 'unknown'
    version: string,
    userAgent: string
  },
  os: {
    type: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown',
    version: string
  },
  device: {
    type: 'mobile' | 'tablet' | 'desktop',
    isTouchable: boolean,
    screenWidth: number,
    screenHeight: number,
    pixelRatio: number,
    screenSize: number | undefined // diagonal in inches
  },
  locale: {
    language: string, // e.g., 'en', 'fr'
    locale: string,   // e.g., 'en-US', 'fr-FR'
    languages: string[],
    timezoneOffset: number, // minutes
    timezone: string | undefined // e.g., 'America/New_York'
  },
  preferences: {
    isDarkMode: boolean | null,
    prefersReducedMotion: boolean,
    prefersReducedTransparency: boolean,
    prefersHighContrast: boolean,
    colorScheme: string | null // 'dark' | 'light'
  },
  connectivity: {
    isOnline: boolean,
    connectionType: string | undefined, // '4g', '3g', '2g', 'slow-2g'
    effectiveBandwidth: number | undefined,
    rtt: number | undefined, // milliseconds
    saveData: boolean | undefined
  }
}
```

### `app.utils.getBrowserState()`

Returns the current browser state object (re-gathered on each call).

```javascript
const state = app.utils.getBrowserState();
if (state.connectivity.isOnline) {
  // Network available
}
```

### `app.utils.hasCapability(capability: string)`

Quick capability check. Returns boolean.

Supported capabilities:
- `'touchable'` — Device supports touch
- `'online'` — Currently online
- `'darkMode'` — Dark mode preference
- `'lightMode'` — Light mode preference
- `'reducedMotion'` — Reduced motion preference
- `'reducedTransparency'` — Reduced transparency preference
- `'highContrast'` — High contrast preference
- `'mobile'` — Mobile device
- `'tablet'` — Tablet device
- `'desktop'` — Desktop device
- `'retina'` — Retina/high-DPI display (pixelRatio >= 2)

```javascript
if (app.utils.hasCapability('mobile')) {
  // Mobile-specific behavior
}

if (app.utils.hasCapability('retina')) {
  // Load high-DPI images
}
```

## Examples

### Responsive Layout

```html
<div class="container" [class.mobile]="ui.browser.device.type === 'mobile'">
  {{content}}
</div>
```

### Dark Mode Toggle

```html
<div [class.dark]="ui.browser.preferences.isDarkMode">
  <body>...</body>
</div>
```

### Offline Indicator

```html
<div *ux-if="!ui.browser.connectivity.isOnline" class="offline-banner">
  You are offline. Some features may be unavailable.
</div>
```

### Locale-Aware Content

```html
<p>
  Your language: {{ui.browser.locale.language}}
  Your timezone: {{ui.browser.locale.timezone}}
</p>
```

### FSM Guard

```yaml
states:
  loading:
    on:
      SUCCESS:
        target: ready
        guard: (ctx, event) => ctx.app.utils.hasCapability('online')
      ERROR: offline
```

## Testing

```bash
npm run test
```

## Notes

- **User Agent Detection**: Based on user agent string parsing. May not be 100% accurate for all browser variants.
- **Permissions**: No special permissions required. Uses standard browser APIs.
- **Privacy**: All detection happens locally in the browser. No data is sent anywhere.
- **Performance**: Detection runs once at startup and caches results. Updates only when needed.
- **Mobile UA Detection**: Heuristic-based. Most reliable on modern devices/browsers.

## Browser Support

- All modern browsers (Chrome, Firefox, Safari, Edge, Opera)
- IE 11+ (limited support; some APIs may not be available)
- Mobile browsers (iOS Safari, Chrome Android, Firefox Android)

## See Also

- [UX3 Plugin System](../../../docs/plugins-dev.md)
- [AppContext](../../../docs/app-context.md)
