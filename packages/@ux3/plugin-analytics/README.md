# @ux3/plugin-analytics

UX3 plugin package.

## Features

- Structured event collection and metadata tagging
- Batched or realtime reporting modes
- Pluggable provider integration
- Retry-safe telemetry buffering
- Lightweight runtime API for UX3 apps

## Installation

```bash
npm install @ux3/plugin-analytics
```

## Basic Usage

```ts
import PluginAnalytics from '@ux3/plugin-analytics';

const app = initializeApp({
  plugins: [PluginAnalytics],
});
```

## Plugin Usage

- Register the plugin in your app with the UX3 plugin registry.
- Configure it through `plugins` config if required.
- Access runtime helpers through `app.utils`, `app.services`, or the plugin export.

## Configuration

This plugin is typically configured through the UX3 plugin registry under `app.config.plugins`.

## API

Plugin-specific helpers are exposed through `app.utils`, `app.services`, or direct plugin exports.

## Example

```ts
import PluginAnalytics from '@ux3/plugin-analytics';

const app = initializeApp({
  plugins: [PluginAnalytics],
});
```

## Notes

- Configure sensitive values through environment variables or secure runtime config.
- Keep plugin registration explicit in your UX3 app configuration.
