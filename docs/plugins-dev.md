# Developer Tools for Plugins

This document describes tools and helpers intended to make development and
debugging of plugins easier.

## Plugin Inspector (browser)

The `installInspector()` function in `src/tools/plugin-inspector.ts` attaches a
`__pluginInspector` object to `window` when called.  The inspector provides
methods to introspect the current registry:

```js
__pluginInspector.plugins();      // list all registered plugins
__pluginInspector.plugin('spa-router'); // get single plugin
__pluginInspector.hooks();        // show hooks grouped by phase
__pluginInspector.loggerEntries(); // view captured log entries
```

Call `installInspector(app.pluginRegistry)` during app initialization to enable
this feature in development builds.

## Console Helpers

The IAM example already exposes several helpers on `window.__iam` and
`window.__iamApp`.  You may extend these as needed.  Example:

```ts
(window as any).__iam.navigate = (path) => {
  window.history.pushState({ path }, '', path);
  // ...trigger router's navigate method
};
```

## CLI Validators & Loaders

* `src/cli/plugin-loader.ts` – list or validate plugins from a directory or
  `node_modules` path.
* `src/build/plugin-validator.ts` – programmatic validator used by CLI or build
  scripts.  It ensures plugins conform to the minimal schema (name/version
  present, `install` function, etc.).

Use these tools in CI to catch malformed plugins before they are published.

## Debugging Workflow

1. Start the dev server (`npm run dev` or `npm run dev:iam`).
2. In the browser console, inspect `window.__pluginInspector`.
3. Register additional plugins at runtime by calling
   `__pluginInspector.plugin('name').install(app)`.
4. Use network/console panel to monitor events; the structured logger emits
   entries that can be filtered by key.

## Example: Inspect Hook List

```js
const map = __pluginInspector.hooks();
console.table(Object.keys(map).map(k => ({ phase: k, plugins: map[k].map(p=>p.plugin) })));
```

## TypeScript Helpers

The `src/testing/plugin-test-utils.ts` module provides helpers for unit tests:

* `createTestApp(plugins?)` – make a bare‑bones AppContext with specified
  plugins installed.
* `mockLogger()` – simple logger capturing entries.
* `mockService(name)` – stub service object.
* `executeHook(phase, ctx)` – manually trigger hooks stored on a context.

See `src/testing/plugin-test-utils.test.ts` for usage examples.
