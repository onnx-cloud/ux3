# Styles — App Guide

Overview
---
How the App App  organizes styling: tokens, compositions (`ux/style/*`), utility classes (Tailwind), generated CSS, and recommended consumer override patterns.

Where to look
---
- Tokens: `examples/iam/ux/token/*` (spacing, colors, typography)
- Compositions: `examples/iam/ux/style/compositions/*` (e.g., `widget.yaml`, `actions.yaml`)
- Global styles: `examples/iam/public/styles` or the generated App  CSS bundle

Guidelines
---
- Prefer `ux-style="<key>"` in templates — the compiler resolves it to `<key>` and composition classes.
- Use tokens for themeable values; override in a scope using CSS variables (e.g., `:root { --color-bg-surface: #fff; }`).
- Keep component templates CSS-free; let the style system generate and apply classes.


### Runtime Registry

A small runtime helper is included as `@ux3/ui/style-registry`.  Projects should
register their semantic-to-utility map during startup and invoke
`initStyleRegistry()` once; this automatically applies classes on
`DOMContentLoaded` and when `ViewComponent` layouts mount.  See the IAM example entrypoint (`examples/iam/index.ts`) or the
`@ux3/ui/bootstrap` helper for a complete usage pattern.

The build/dev pipeline also participates: the `ConfigGenerator` will scan
`ux/style/` recursively at build time, flattening every YAML file it finds into
the generated `config.styles` object.  This means you never need to manually
touch code when adding or renaming style compositions – once the compiler has
run the runtime registry already knows about the new keys.

Examples
---
- `examples/iam/ux/style/compositions/widget.yaml` shows combining utilities and props.

