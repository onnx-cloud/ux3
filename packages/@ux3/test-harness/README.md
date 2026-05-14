# @ux3/test-harness

Testing utilities and fixtures for UX3 Framework - FSM testing, mock services, view testing helpers

## Features

- FSM test fixtures and transition helpers
- Service mocking and call recording
- View rendering test utilities
- Assertion helpers for UX3 state and event behavior

## Installation

```bash
npm install @ux3/test-harness
```

## Basic Usage

```ts
import TestHarness from '@ux3/test-harness';

const app = initializeApp({
  plugins: [TestHarness],
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
import TestHarness from '@ux3/test-harness';

const app = initializeApp({
  plugins: [TestHarness],
});
```

## Notes

- Configure sensitive values through environment variables or secure runtime config.
- Keep plugin registration explicit in your UX3 app configuration.
