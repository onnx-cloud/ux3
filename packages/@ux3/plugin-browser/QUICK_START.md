# plugin-browser Quick Start

Get browser state injected into your UX3 app in 2 minutes.

## 1. Install

```bash
npm install @ux3/plugin-browser
```

## 2. Register Plugin

### Option A: JavaScript Configuration

```javascript
// app.js or config
import BrowserPlugin from '@ux3/plugin-browser';

const app = new UX3App({
  plugins: [BrowserPlugin],
  // ... other config
});
```

### Option B: YAML Configuration

```yaml
# ux3.yaml or app config
plugins:
  '@ux3/plugin-browser':
    injectToUI: true
    trackConnectivity: true
```

## 3. Use in Templates

```html
<!-- Access browser state directly -->
<div class="device-{{ui.browser.device.type}}">
  Running {{ui.browser.browser.name}}
</div>

<!-- Check capabilities -->
<div *ux-if="ui.browser.device.isTouchable">
  👇 Tap to continue
</div>

<div *ux-if="!ui.browser.device.isTouchable">
  🖱️ Click to continue
</div>

<!-- Dark mode support -->
<div [class.dark]="ui.browser.preferences.isDarkMode">
  <!-- Content adapts to dark mode -->
</div>

<!-- Offline detection -->
<div *ux-if="!ui.browser.connectivity.isOnline" class="alert alert-warning">
  You are offline
</div>
```

## 4. Use in FSM Logic

```typescript
// In a guard or action
if (app.utils.hasCapability('mobile')) {
  // Mobile-specific handling
  navigate('/mobile');
} else {
  navigate('/desktop');
}

// Or get full state
const state = app.utils.getBrowserState();
if (state.preferences.isDarkMode) {
  applyDarkTheme();
}
```

## Available Checks

```javascript
// All return boolean
app.utils.hasCapability('mobile')      // true if mobile device
app.utils.hasCapability('tablet')      // true if tablet device
app.utils.hasCapability('desktop')     // true if desktop device
app.utils.hasCapability('touchable')   // true if touch-capable
app.utils.hasCapability('online')      // true if online
app.utils.hasCapability('darkMode')    // true if prefers dark mode
app.utils.hasCapability('retina')      // true if high-DPI display
```

## Get Full State

```javascript
const state = app.utils.getBrowserState();

// Browser info
console.log(state.browser.name);     // 'chrome', 'firefox', etc
console.log(state.browser.version);  // '120.0.0.0'

// Device info
console.log(state.device.type);      // 'mobile', 'tablet', 'desktop'
console.log(state.device.screenWidth);
console.log(state.device.pixelRatio);

// Locale
console.log(state.locale.language);  // 'en', 'fr', etc
console.log(state.locale.timezone);  // 'America/New_York'

// Preferences
console.log(state.preferences.isDarkMode);
console.log(state.preferences.prefersReducedMotion);

// Connectivity
console.log(state.connectivity.isOnline);
console.log(state.connectivity.connectionType); // '4g', '3g', etc
```

## That's It!

The plugin automatically:
- ✅ Detects browser, OS, device type
- ✅ Captures user locale and timezone
- ✅ Monitors dark mode and accessibility preferences
- ✅ Tracks online/offline status
- ✅ Injects everything into `app.ui.browser`
- ✅ Provides utility functions for easy checks

See [README.md](./README.md) for complete API reference.
