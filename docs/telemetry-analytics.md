# Telemetry and Analytics

UX3 supports lightweight telemetry through @ux3/plugin-analytics.

Design goals:

- Lightweight runtime overhead
- Idiomatic UX3 integration through logger and window.__ux3Telemetry
- Flexible provider adapters for external analytics and BI platforms
- Batch mode by default to prevent event storms
- Realtime mode when low-latency events are required

## Quick Start

Install the plugin in your app config:

```yaml
plugins:
  - "@ux3/plugin-analytics"
```

Plugin configuration is read from either:

- plugins["@ux3/plugin-analytics"]
- plugins.analytics

## Event Sources

The plugin can capture telemetry from:

- Structured logger events (default enabled)
- Global telemetry hook window.__ux3Telemetry (default enabled)
- Manual app events via app.utils.analyticsTrack(...)

## Example 1: Default Batched Mode

Use batched delivery for most applications.

```ts
const config = {
  plugins: {
    '@ux3/plugin-analytics': {
      endpoint: 'https://ingest.example.com/ux3/events',
      mode: 'batch',
      batchSize: 20,
      flushInterval: 5000,
      maxQueueSize: 1000,
      dropPolicy: 'oldest'
    }
  }
};
```

Behavior:

- Events are queued and sent in batches
- Queue is flushed on interval, pagehide, beforeunload, and visibility hidden
- Oldest events are dropped when queue cap is reached

## Example 2: Realtime Critical Events Only

Use realtime mode only for urgent events such as checkout failures or auth lockouts.

```ts
const config = {
  plugins: {
    '@ux3/plugin-analytics': {
      mode: 'realtime',
      endpoint: 'https://ingest.example.com/ux3/realtime',
      captureLogs: true,
      filter: (event) => {
        const name = String(event.name || '');
        const level = String(event.level || '');
        return level === 'error' ||
          name.startsWith('checkout.') ||
          name.startsWith('auth.');
      }
    }
  }
};
```

This pattern keeps noise low while ensuring critical telemetry is delivered immediately.

## Example 3: Custom Provider for Zoho, Power BI, Tableau, or Internal Pipelines

Use provider adapters to route events to your preferred destination.

```ts
import analyticsPlugin, { type AnalyticsProvider } from '@ux3/plugin-analytics';

const customProvider: AnalyticsProvider = {
  name: 'bi-provider',
  async trackBatch(events) {
    await fetch('https://bi.example.com/collector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'ux3', events }),
      keepalive: true
    });
  },
  async track(event) {
    await this.trackBatch?.([event]);
  }
};

const config = {
  plugins: {
    '@ux3/plugin-analytics': {
      mode: 'batch',
      providers: [customProvider],
      transform: (event) => ({
        ...event,
        tags: { ...event.tags, app: 'customer-portal' }
      })
    }
  }
};
```

Notes:

- For Zoho and similar APIs, create a provider that maps fields to vendor schema.
- For Power BI or Tableau ingestion endpoints, use trackBatch for efficient upload.
- You can chain multiple providers in parallel, for example one for product analytics and one for BI.

## Built-In Provider Helpers

The plugin exports helper providers:

- createHttpAnalyticsProvider(endpoint)
- createGoogleAnalyticsProvider()
- createDataLayerProvider()

Example:

```ts
import {
  createGoogleAnalyticsProvider,
  createDataLayerProvider
} from '@ux3/plugin-analytics';

const config = {
  plugins: {
    '@ux3/plugin-analytics': {
      mode: 'batch',
      providers: [
        createGoogleAnalyticsProvider(),
        createDataLayerProvider()
      ]
    }
  }
};
```

## Manual Instrumentation

Add domain-specific events from app code:

```ts
app.utils.analyticsSetContext({
  tenantId: 'tenant-42',
  env: 'production'
});

app.utils.analyticsTrack('checkout.completed', {
  orderId: 'ord_123',
  value: 99.95,
  currency: 'USD'
});

app.utils.analyticsFlush();
```

## Operational Guidance

- Default to batch mode unless you have a strict realtime requirement.
- Use filter and transform to reduce payload size and remove sensitive fields.
- Keep provider logic small and deterministic; push heavy transformation to backend pipelines.
- Use baseContext for stable tags such as app name, environment, tenant, and release.
