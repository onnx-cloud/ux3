# Parts & Theming — IAM

Purpose
---
Document the `part` surface for App components and show how to use CSS custom properties (tokens) to theme components.

Rules
---
- Expose only a small, documented set of `part` names per component (e.g., `start`, `center`, `actions` for `action-bar`).
- Preserve `part` attributes through compilation and widget wrApp ing.
- Prefer CSS custom properties for themeable variables (colors, gaps, spacing). Example naming: `--widget-gap` or `--spacing-md`.

Example — `action-bar`
Template (component author):
```html
<header part="start" ux-style="widget-start"><slot name="start"></slot></header>
<nav part="actions" ux-style="widget-actions"><slot name="actions"></slot></nav>
```
Consumer theming:
```css
:root { --widget-gap: 12px; }
my-action-bar::part(actions) { gap: var(--widget-gap); }
```
Guidance
---
- Use `::part()` for structural styling; use CSS vars for values consumers are likely to tweak.
- Avoid exposing many parts — document the minimal surface in the component README.

Reference
---
- Style spec: `docs/STYLE_SPEC.md`
