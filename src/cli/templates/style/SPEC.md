# Template: `style`

Used by: `ux3 generate style <name>`

## Tokens

| Token | Example |
|---|---|
| `[[ name ]]` | `button` |
| `[[ Name ]]` | `Button` |
| `[[ date ]]` | `2026-04-21` |

## Files emitted (relative to `ux/style/`)

```
[[ name ]].yaml   — widget style mapping
```

## Conventions

- `widget` must match the component/widget name as used in templates via `ux-style`.
- `base` is always applied; `variants` are conditionally applied via the `variant` attribute.
- Class values are plain CSS class strings — no framework-specific syntax.
- If using Tailwind, use Tailwind utility classes directly.
- Avoid one-off inline classes in templates; prefer named variants here.
- Variant keys must be lowercase identifiers (e.g. `primary`, `danger`, `sm`).

## Style shape

```yaml
widget: [[ name ]]
base: [[ name ]]
variants:
  default: [[ name ]]-default
  primary: [[ name ]]-primary
  danger: [[ name ]]-danger
  sm: [[ name ]]-sm
  lg: [[ name ]]-lg
```

## Example invocation

```bash
ux3 generate style button
ux3 generate style card
ux3 generate style form-field
```
