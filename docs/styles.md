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
- Keep component templates CSS-free; let the style system generate and Apply classes.

Examples
---
- `examples/iam/ux/style/compositions/widget.yaml` shows combining utilities and props.

