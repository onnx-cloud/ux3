# @ux3/plugin-charts-js (sample package)

This is a fully‑typechecked npm package shipped with the monorepo. It doubles
as a template for external plugin authors and as a real integration used in
internal examples.

## Highlights

* Written in TypeScript. `npm run build` compiles to `dist/`.
* Peer‑depends on `charts.js` so the host project controls the version.
* Calls `app.registerAsset()` to add a CDN `<script>` tag.
* Registers a `chart` service that lazy loads the charts library when first
  used.

### Using in a project

```bash
npm install @ux3/plugin-charts-js
```

In your `ux3.yaml`:

```yaml
plugins:
  - '@ux3/plugin-charts-js'
```

or programmatically:

```ts
import ChartsPlugin from '@ux3/plugin-charts-js';
appContext = await createAppContext(config);
appContext.registerPlugin(ChartsPlugin);
```

### Advanced

Because the package exports a `Plugin` instance you can inspect its
`install` method to see how helpers like `registerAsset` and `registerService`
are used. This is a good starting point when writing real plugins.