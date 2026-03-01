# Project Plugins

In addition to the built-in suite, applications can ship their own plugins
within the repository. These project plugins are auto-discovered at build time
and installed alongside core plugins.

## Location

Place plugin modules under `examples/iam/plugins` (or `./plugins` relative to
your app entrypoint).  Files may be `.ts` or `.js`, and may reside in nested
subdirectories.  Each module must `export default` a valid `Plugin` object.

```text
examples/iam/plugins/
  monitoring.ts
  analytics.ts
  custom-auth.ts
```

## Automatic Loading

The bootstrap code in `examples/iam/app.ts` includes the following snippet:

```ts
if (typeof import.meta !== 'undefined' && import.meta.glob) {
  const mods = import.meta.glob('../plugins/*.{ts,js}', { eager: true });
  for (const path in mods) {
    const mod: any = (mods as any)[path];
    const pl = mod?.default;
    if (pl && typeof pl.install === 'function') {
      pl.install(appInstance as any);
    }
  }
}
```

This uses Vite's glob import feature to bundle all plugin files and invoke
their install hooks during app initialization.

> **Note:** in non‑Vite environments (e.g. server-side tests) the import may
> fail.  The code is designed to gracefully skip plugin loading in that case.

## Example Plugins

### Monitoring (`monitoring.ts`)
```ts
export default {
  name: 'iam-monitoring',
  version: '1.0.0',
  hooks: {
    app: {
      [AppLifecyclePhase.INIT]: [(ctx) => ctx.app?.logger.log('app.monitoring.init')]
    },
    service: {
      [ServiceLifecyclePhase.ERROR]: [(ctx) => {
        ctx.app?.logger.error('app.service.error', { service: ctx.service?.name });
      }]
    }
  }
} as Plugin;
```

### Analytics (`analytics.ts`)
```ts
export default {
  name: 'iam-analytics',
  version: '1.0.0',
  hooks: {
    app: {
      [AppLifecyclePhase.READY]: [(ctx) => {
        ctx.app?.logger.subscribe(entry => {
          // forward entry to external analytics
        });
      }]
    }
  }
} as Plugin;
```

### Custom Auth (`custom-auth.ts`)
```ts
export default {
  name: 'iam-auth-custom',
  version: '1.0.0',
  services: {
    'iam.service.custom-auth': CustomAuthService
  }
} as Plugin;
```

## Testing

The discovery mechanism is exercised by two test suites:

* `src/build/__tests__/plugin-loader-project.test.ts` – ensures
  `PluginLoader.loadProjectPlugins()` finds plugins in arbitrary directories.
* `examples/iam/__tests__/project-plugins.test.ts` – loads the example app and
  asserts that project plugins contributed side effects (e.g. logger
  subscribers).

## CLI Support

You may load project plugins via script using `PluginLoader`:

```ts
import { PluginLoader } from '@ux3/build/plugin-loader';
const loader = new PluginLoader();
const plugins = await loader.loadProjectPlugins('./plugins');
plugins.forEach(p => myRegistry.register(p));
```

A lightweight CLI wrapper is provided at `src/cli/plugin-loader.ts` for
quick manual checks during development or CI.  Run with Node:

```bash
# list discovered plugins
node src/cli/plugin-loader.js list examples/iam/plugins

# validate structure (exits non-zero on error)
node src/cli/plugin-loader.js validate examples/iam/plugins
```

This is useful for build‑time validation or when running outside the browser.
