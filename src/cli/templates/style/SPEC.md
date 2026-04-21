# UX Style Hints

`ux/style/` defines semantic style mappings for widgets and components.

## What belongs here

- Widget style contracts (`widget`, `base`, `variants`).
- Reusable visual semantics instead of one-off class usage in templates.

## Styling model

- `widget` maps to the component/widget key used by `ux-style`.
- `base` classes are always applied.
- `variants` provide conditional visual modes (`primary`, `danger`, `sm`, etc.).

## Authoring conventions

- Keep variant names stable and lowercase.
- Prefer semantic variant names over implementation detail names.
- Keep templates presentation-light: choose variants, do not inline large class strings.
- Keep spacing/typography decisions centralized in style mappings where possible.

## Framework compatibility

- Class values are plain strings and can map to your CSS system (custom CSS, Tailwind, etc.).
- Avoid coupling style keys to transient utility decisions.

## Reference shape

```yaml
widget: button
base: btn
variants:
  default: btn-default
  primary: btn-primary
  danger: btn-danger
  sm: btn-sm
  lg: btn-lg
```
