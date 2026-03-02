# @ux3/plugin-stripe (sample package)

A payments integration example that shows configuration and conditional asset
injection.

## Features

* Reads `app.config.plugins.stripe` for options such as `apiKey` or `cdn`.
* Uses `app.registerAsset()` when a CDN URL is provided.
* Provides a `stripe` service via `app.registerService()` that lazy loads the
  Stripe SDK.

## Installation

```bash
npm install @ux3/plugin-stripe
```

## Configuration

```yaml
plugins:
  - name: '@ux3/plugin-stripe'
    config:
      apiKey: 'pk_test_...'
      cdn: 'https://js.stripe.com/v3'
```

Alternately you can mutate the config in code before calling
`createAppContext`.

## Notes

Unlike most examples this package defines its own `StripeConfig` interface so
TypeScript users get autocomplete when inspecting `app.config.plugins`. The
`install` function also demonstrates how to throw early if required fields are
missing, allowing the host to fail fast during development.