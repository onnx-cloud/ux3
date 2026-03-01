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
`DOMContentLoaded` and when `ViewComponent` layouts mount.  See the IAM example
(`examples/iam/app.ts`) for a complete usage pattern.

Examples
---
- `examples/iam/ux/style/compositions/widget.yaml` shows combining utilities and props.

