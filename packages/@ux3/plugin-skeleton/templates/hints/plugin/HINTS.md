# UX Plugin Hints

`packages/@ux3/plugin-*` packages extend UX3 with reusable integrations and capabilities.

## What belongs here

- A plugin descriptor object exported as default.
- Registration logic in `install(app)` for components, services, hooks, or feature wiring.
- Package metadata that tracks peer compatibility with UX3.

## Runtime role

- Plugins are loaded into the app to augment behavior without modifying core framework code.
- `install(app)` should be deterministic and safe to run once per app bootstrap.
- Plugin code should coordinate extension points, not implement full app business flows.

## Authoring conventions

- Keep plugin slug lowercase kebab-case.
- Use package naming `@ux3/plugin-<name>`.
- Keep external dependencies minimal and explicit.
- Prefer small, composable plugin responsibilities over monolithic plugin bundles.

## Compatibility guidance

- Declare `@ux3/ux3` as peer dependency.
- Keep `ux3PeerVersion` aligned with supported framework ranges.
- Document expected config and side effects in plugin README files.

## Reference shape

```typescript
import type { Plugin } from '@ux3/ux3';

const analytics: Plugin = {
  name: '@ux3/plugin-analytics',
  version: '0.1.0',
  ux3PeerVersion: '^0.1.0',
  description: 'Analytics plugin for UX3.',
  install(_app) {
    // register plugin integrations
  },
};

export default analytics;
```
