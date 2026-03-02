# Testing Plugins

A robust test suite ensures plugins behave correctly and integrate with the
framework.  This page explains how to exercise plugins in isolation and inside
real applications.

## Unit Tests

Use the utilities in `src/testing/plugin-test-utils.ts` to build lightweight
contexts for plugin unit tests.

```ts
import { describe, it, expect } from 'vitest';
import { createTestApp, mockLogger, executeHook } from '@ux3/testing/plugin-test-utils';
import MyPlugin from '../path/to/plugin';

describe('my-plugin', () => {
  it('registers a hook on INIT', async () => {
    const app = createTestApp([MyPlugin]);
    app.logger = mockLogger();

    await executeHook('ux3.app.phase.init', { app, phase: 'ux3.app.phase.init' });
    expect(app.logger.entries.length).toBeGreaterThan(0);
  });
});
```

## Integration Tests

For end‑to‑end verification, load plugins into the IAM example or another
real app and exercise the UI or services.  The current example exposes a
minimal initializer from `examples/iam/index.ts` which simply uses the
framework-provided bootstrap helper:

```ts
import { describe, it, expect } from 'vitest';
import { initApp } from '../examples/iam/index';

// shim for backwards compatibility
const hydrate = initApp;

describe('project plugin integration', () => {
  it('analytics plugin adds logger subscriber', async () => {
    const app = await initApp();
    const logger: any = app.logger;
    expect(logger.listeners && logger.listeners.length).toBeGreaterThan(0);
  });
});
```

The `examples/iam/__tests__` directory contains several integration tests that
can serve as templates.

The `examples/iam/__tests__` directory contains several integration tests that
can serve as templates.

## CI Validation

Include plugin validation as part of your CI pipeline:

```bash
node src/cli/plugin-loader.js validate examples/iam/plugins
```

This command fails if any plugin is missing required fields or has syntax
errors.

## Coverage

Aim for at least 80% coverage on plugin-related modules.  Use `npm run
coverage` to generate reports; focus on hooks registration, service overrides,
and loader behavior.
