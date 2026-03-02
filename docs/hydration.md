# Client-side Hydration

UX3 applications are primarily configured at build time and rendered as static HTML. To turn the server output into a full SPA, a small runtime bundle must be injected and initialized. This document describes the runtime injection strategy and how to customise hydration behaviour.

## Runtime Manifest

The build process now records bundle and stylesheet paths in the `build-manifest.json` under a new `runtime` section:

```json
{
  "runtime": {
    "bundle": "dist/ux3.bundle.js",
    "styles": ["dist/ux3.tokens.css"],
    "version": "1.0.0",
    "minified": true
  }
}
```

The CLI commands (`ux3 build` / `ux3 dev`) supply this information to the dev server as well, allowing the server to automatically inject the correct `<script>` and `<link>` tags.

## Configuration (`ux3.yaml`)

Projects can influence injection via the optional `site.runtime` section:

> **No entry file?**
> You don’t actually need a `src/index.ts` or any bootstrap code for the
> framework to work.  In absence of a custom initializer the dev server and
> bundler will still emit a minimal runtime bundle that exports the generated
> `config` and logs a message.  The hydration function can live anywhere or
> be omitted entirely; the CLI-generated `src/index.ts` is merely a
> convenience (and safe to delete) when you want to add application-specific
> startup logic.


```yaml
site:
  runtime:
    bundleKey: "ux3.bundle"      # key used by manifest entry
    stylesKey: "ux3.styles"      # not yet used but reserved for future
    hydrationFn: "initApp"       # function the inline script will call
    # initialState: "__INITIAL_STATE__" # window variable to pass
```

`bundleKey` is required to trigger the injection logic. `hydrationFn` defaults to `initApp`.

## Dev Server Behaviour

When serving pages in development the dev server merges configuration from the manifest, `ux3.yaml` and any project defaults.  After running `processAssets()` the server appends:

* `<link data-ux3="styles" ...>` tags for each stylesheet in the manifest
* `<script data-ux3="app" data-ux3-version="…" ...>` tag pointing at the runtime bundle
* An inline `<script data-ux3="hydration">` that listens for `DOMContentLoaded` and invokes the hydration function

Hot reload events will replace both style and script tags (see `DevServer` hot-reload handler).

## Entry Points and Hydration Code

The framework no longer generates a hard‑coded IIFE entry. Instead projects supply their own bootstrap code; `ux3 create` will generate a minimal `src/index.ts` like the IAM example which simply imports a helper from the framework:

```ts
import { createBootstrap } from '@ux3/ui/bootstrap';
import { config } from './generated/config.js';

export const initApp = createBootstrap(config); // also exported as `hydrate`
```

This `initApp` function is what the runtime script will call (the name can be
customised via `site.runtime.hydrationFn`).  It handles all of the boilerplate
shown previously — registering styles, wiring up service reconnection, and
attaching itself to `window`/`DOMContentLoaded` when executed in a browser.

For quick samples or tests you may also import the raw `hydrate` helper from
`@ux3/ui/bootstrap` and call it directly:

```ts
import { hydrate } from '@ux3/ui/bootstrap';

await hydrate(config, { recoverState: true, reattachListeners: true });
```

Either approach returns an `AppContext` which you can inspect or manipulate.

You can also mount manually or execute tests by calling the exported function.

## Hydration State

A small amount of application state (usually the current FSM states and contexts) may be serialized server‑side and made available on `window.__INITIAL_STATE__`. The hydration function can read this value and pass it to `app.recoverState()` when building the context. To enable this behaviour set `site.runtime.initialState` to the global variable name and ensure your hydration code handles it.

---

## Development Helpers

When `ux3.yaml` contains a `development` section the runtime builder
will enable additional diagnostics during `createAppContext`.

```yaml
development:
  logging: debug        # lowers logger threshold to `debug`
  inspector: true       # expose `window.__ux3Inspector`
```

*Setting `logging: debug` also wires `window.__ux3Telemetry` so that
any telemetry events produced by the core are written via the logger.
Projects can supply their own telemetry hook or simply inspect the
console.*

If `inspector` is enabled a small overlay widget (`<ux3-inspector>`) is
automatically mounted into the document body.  It shows a JSON snapshot
of the current FSM states and registered services, updating live as
machines transition.  The overlay is rendered using the UX3 framework
primitives so your own applications can extend or re-skin it if desired.
Clicking the panel will toggle its visibility.

The inspector reference attached to `window.__ux3Inspector` is simply
the `AppContext` object; tooling or tests can interact with it directly
(e.g. `window.__ux3Inspector.machines.home.getState()`).  When the
debugger is enabled a log message (`inspector enabled`) will be emitted
at startup.

## References

For full examples and tests refer to `examples/iam` and the unit tests under `tests/ui/hydration.test.ts`.
