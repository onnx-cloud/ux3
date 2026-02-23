# `ux-style` Guide — IAM

Purpose
---
Show how App uses `ux-style` compositions and how authors should author and override styles.

Principles
---
- Templates remain CSS-free; style is driven by composition YAML + tokens + generated CSS.
- `ux-style="<key>"` maps to a generated host class `ux-style-<key>` and includes composition utility classes (e.g., Tailwind utils) for immediate defaults.
- Consumers override via `class` or CSS vars.

Example composition (IAM):
```yaml
# examples/iam/ux/style/compositions/widget.yaml
widget:
  base: 'p-4 bg-white rounded-md shadow-sm text-gray-800'
  props:
    direction: 'vertical'
    gap: 'md'
```
Template usage:
```html
<div ux-style="widget">Content</div>
```
Compiled output (SSR/client parity):
```html
<div class="ux-style-widget p-4 bg-white rounded-md shadow-sm text-gray-800">Content</div>
```
Override precedence
---
- Generated composition classes < consumer `class` < inline style (avoid inline styles).

Tailwind note
---
- Ensure Tailwind doesn't purge generated utility classes (see `tailwind-integration.md`).

Reference
---
- Style spec: `docs/STYLE_SPEC.md`
