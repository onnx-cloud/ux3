# @ux3/plugin-stripe

Stripe payment integration for UX3 — PCI-compliant tokenization

## Features

- Stripe payment method creation and confirmation
- PCI-compliant tokenization support
- Secure payment flows for UX3 services
- Client-side integration helpers

## Installation

```bash
npm install @ux3/plugin-stripe
```

## Basic Usage

```ts
import PluginStripe from '@ux3/plugin-stripe';

const app = initializeApp({
  plugins: [PluginStripe],
});
```

## Plugin Usage

- Register the plugin in your app with the UX3 plugin registry.
- Configure it through `plugins` config if required.
- Access runtime helpers through `app.utils`, `app.services`, or the plugin export.

## Configuration

```yaml
plugins:
  - name: '@ux3/plugin-stripe'
    config:
      # Plugin-specific options
      
```

## API

Plugin-specific helpers are exposed through `app.utils`, `app.services`, or direct plugin exports.

## Example

```ts
import PluginStripe from '@ux3/plugin-stripe';

const app = initializeApp({
  plugins: [PluginStripe],
});
```

## Notes

- Configure sensitive values through environment variables or secure runtime config.
- Keep plugin registration explicit in your UX3 app configuration.
