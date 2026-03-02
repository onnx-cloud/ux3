# Charts.js plugin (example)

This directory contains a minimal UX3 plugin that demonstrates the
conventions used by real packages. It is not published to npm but can be referenced via a relative path in a project `package.json` or `ux3.yaml`.

## Features

* Adds a `<script>` tag for the charts.js CDN when installed.
* Exposes a `chart` service which lazily imports the `charts.js` library.
* Shows how to declare a peer dependency and disable side effects.

To use it in a local app you can run:

```bash
npm install ../plugins/charts.js
```

and then register `@ux3/plugin-charts-js` in your `ux3.yaml` or bootstrap
code.
