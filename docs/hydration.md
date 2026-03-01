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

The framework no longer generates a hard‑coded IIFE entry. Instead projects supply their own bootstrap code (for example `examples/iam/index.ts`) which is bundled by esbuild. It is the responsibility of that code to export or expose a function matching the `hydrationFn` name. The helper below is typical:

```ts
async function boot() {
  await hydrate(config, { recoverState: true, reattachListeners: true });
}

// expose for runtime script
(window as any).initApp = boot;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
```

You can also mount manually or execute tests by calling the exported function.

## Hydration State

A small amount of application state (usually the current FSM states and contexts) may be serialized server‑side and made available on `window.__INITIAL_STATE__`. The hydration function can read this value and pass it to `app.recoverState()` when building the context. To enable this behaviour set `site.runtime.initialState` to the global variable name and ensure your hydration code handles it.

---

For full examples and tests refer to `examples/iam` and the unit tests under `tests/ui/hydration.test.ts`.
