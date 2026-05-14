# @ux3/plugin-browser

UX3 browser detection plugin - injects browser state, device info, preferences, connectivity

## Features

- Browser and device capability detection
- Locale, timezone, and preference injection
- Connectivity monitoring with live updates
- Touch, mobile, tablet, and desktop classification
- Zero-config browser state support

## Installation

```bash
npm install @ux3/plugin-browser
```

## Basic Usage

```ts
import BrowserPlugin from '@ux3/plugin-browser';

const app = initializeApp({
  plugins: [BrowserPlugin],
});
```

## Plugin Usage

- Register the plugin in your app with the UX3 plugin registry.
- Enable `injectToUI` to populate `app.ui.browser` with browser state.
- Use `app.utils.getBrowserState()` and `app.utils.hasCapability()` in guards and services.

## Configuration

```yaml
plugins:
  - name: '@ux3/plugin-browser'
    config:
      injectToUI: true
      trackConnectivity: true
      onChange: (state) => {
        console.log('Browser state changed', state);
      }
```

## API

- `app.ui.browser` — injected browser state when `injectToUI` is enabled.
- `app.utils.getBrowserState()` — gathers the latest browser state.
- `app.utils.hasCapability(capability: string)` — checks supported capabilities such as `mobile`, `desktop`, `touchable`, `online`, `darkMode`, `retina`.

## Example

```ts
const state = app.utils.getBrowserState();

if (!state.connectivity.isOnline) {
  console.warn('Offline mode enabled');
}

if (app.utils.hasCapability('mobile')) {
  renderMobileLayout();
}

console.log('Browser locale:', state.locale.locale);
```

## Notes

- This plugin is designed to run in browser environments only.
- `app.ui.browser` is updated automatically when connectivity changes if `trackConnectivity` is enabled.
