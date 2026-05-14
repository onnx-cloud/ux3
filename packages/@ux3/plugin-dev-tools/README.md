# @ux3/plugin-dev-tools

Development tooling plugin for UX3 (inspector, diagnostics, event stream)

## Features

- Runtime inspection of plugins and app state
- Event stream monitoring for FSM and service activity
- Diagnostics helpers for views and workflows
- Developer-focused UX3 debugging utilities

## Installation

```bash
npm install @ux3/plugin-dev-tools
```

## Basic Usage

```ts
import DevToolsPlugin from '@ux3/plugin-dev-tools';

const app = initializeApp({
  plugins: [DevToolsPlugin],
});
```

## Plugin Usage

- Register the plugin in your app with the UX3 plugin registry.
- Access `app.utils.devTools` for snapshots and event subscription.
- Open the inspector or devtools panel programmatically.

## Configuration

```yaml
plugins:
  - name: '@ux3/plugin-dev-tools'
    config:
      inspector: true
      devTools: true
      maxEvents: 1000
```

## API

- `app.utils.devTools.getSnapshot()` — get the current devtools snapshot.
- `app.utils.devTools.subscribe(handler)` — subscribe to snapshot updates.
- `app.utils.devTools.emit(source, type, payload?)` — emit a custom diagnostic event.
- `app.utils.devTools.open(panel?)` — open the devtools panel.

## Example

```ts
const snapshot = app.utils.devTools.getSnapshot();
console.log(snapshot);

const unsubscribe = app.utils.devTools.subscribe((next) => {
  console.log('DevTools snapshot changed', next);
});

app.utils.devTools.open('inspector');
```

## Notes

- This plugin is intended for development builds only.
- Keep `devTools` disabled in production unless explicitly required.
