# Tailwind‑PLUS plugin (example)

This sample demonstrates a styling plugin with both build‑time and runtime
behaviour.

* peer‑depends on `tailwindcss`
* a real package would export a Vite plugin or CLI script that adds the
  necessary PostCSS/Tailwind configuration when installed.  For the purposes of
  this example we simply document that step.
* at runtime the plugin looks for `config.plugins['tailwind-plus'].css` – a
  path generated during the build – and registers it as a `<link>` asset.
* exposes a `useStyle` util to merge class names; real code lives in
  `packages/stdlib` in the main repo.

The main advantage of keeping this sample under `./plugins` is that you can
step through the code while running the example app or tests.
