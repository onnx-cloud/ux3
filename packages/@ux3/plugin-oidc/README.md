# @ux3/plugin-oidc

OIDC/OAuth2 plugin for UX3 with provider presets

## Features

- OpenID Connect and OAuth2 provider support
- Presets for Google, Auth0, Okta, Cognito
- Login, logout, and token refresh workflows
- Callback and redirect handling
- Secure client-side auth flow helpers

## Installation

```bash
npm install @ux3/plugin-oidc
```

## Basic Usage

```ts
import PluginOidc from '@ux3/plugin-oidc';

const app = initializeApp({
  plugins: [PluginOidc],
});
```

## Plugin Usage

- Register the plugin in your app with the UX3 plugin registry.
- Configure it through `plugins` config if required.
- Access runtime helpers through `app.utils`, `app.services`, or the plugin export.

## Configuration

```yaml
plugins:
  - name: '@ux3/plugin-oidc'
    config:
      # Plugin-specific options
      
```

## API

Plugin-specific helpers are exposed through `app.utils`, `app.services`, or direct plugin exports.

## Example

```ts
import PluginOidc from '@ux3/plugin-oidc';

const app = initializeApp({
  plugins: [PluginOidc],
});
```

## Notes

- Configure sensitive values through environment variables or secure runtime config.
- Keep plugin registration explicit in your UX3 app configuration.
