# Ecosystem Plugins

Alongside the core framework and project-specific extensions, UX3 supports a
larger ecosystem of **official and third-party npm packages**.  These packages
follow the same `Plugin` interface and can be installed via the `PluginRegistry`
or by importing directly in application code.

## Official Packages

The following packages are maintained by the UX3 team and published on npm under
the `@ux3` scope:

* `@ux3/plugin-i18n` – enhanced internationalization features
* `@ux3/plugin-sentry` – error reporting integration with Sentry
* `@ux3/plugin-analytics` – analytics/telemetry helpers
* `@ux3/plugin-validation` – additional form validation rules
* `@ux3/plugin-charts-js` – sample charting integration with lazy service and CDN asset
* `@ux3/plugin-stripe` – sample payments integration demonstrating conditional asset injection
* `@ux3/plugin-tailwind-plus` – styling helper with FSM/view/route demo and utility hooks

Each package lives in the `packages/@ux3/` directory of the repo and exposes a
default plugin object.  You can inspect or modify them locally for testing, and
`npm install` them as dependencies in your application.

### Installation Example

```bash
npm install @ux3/plugin-i18n @ux3/plugin-analytics
```

```ts
import { PluginRegistry } from '@ux3/plugin-registry';
import i18n from '@ux3/plugin-i18n';
import analytics from '@ux3/plugin-analytics';

const registry = new PluginRegistry();
registry.register(i18n);
registry.register(analytics);
```

## Publishing Guidelines

To publish an official plugin:

1. Increment the version in `packages/@ux3/<plugin>/package.json`.
2. Build the package (`npm run build` inside that directory).
3. Run `npm publish --access public` from the package directory.
4. Update the changelog and release notes in the main repository.

Automated GitHub Actions workflows should handle these steps when a Git tag is
created (see `.github/workflows/publish.yml` for an example).  Ensure all tests
pass before releasing.

## Third‑Party Plugins

Community authors may create their own npm packages that export a UX3 plugin.
These packages should declare `peerDependencies` on `@ux3/ux3` to ensure
compatibility.  Once published, they can be installed and registered just like
official packages.

### Helper APIs
The framework exposes several helper methods on `AppContext` to simplify plugin
code: `registerAsset`, `registerService`, `registerComponent`,
`registerView`, `registerRoute`, `registerMachine` and `registerPlugin` itself.
Using these instead of mutating configuration objects directly ensures that
runtime metadata stays consistent and allows the core to emit telemetry or
validation warnings.  The `@ux3/plugin-tailwind-plus` package serves as a
cookbook for these APIs; check its `src/index.ts` for examples of FSM,
view and route registration.

## Using the CLI Loader

The CLI helper (`src/cli/plugin-loader.ts`) works with npm packages too –
specify a path pointing to `node_modules`:

```bash
node src/cli/plugin-loader.js list node_modules/@ux3
```

This is useful for debugging version mismatches or ensuring a package
genuinely exports a plugin object.

## Testing

The `src/plugins/__tests__/npm-packages.test.ts` script verifies that the
local package sources can be `require()`d successfully.  When adding a new
official package, add an entry to that test.

## Contribution

Third‑party plugin authors are welcome!  Follow the existing package structure
and add your plugin to the ecosystem docs.  For major contributions, open a
PR against this repo so that your plugin can be referenced and tested.
