# Template: `validation`

Used by: `ux3 generate validation <name>`

## Tokens

| Token | Example |
|---|---|
| `[[ name ]]` | `login` |
| `[[ Name ]]` | `Login` |
| `[[ date ]]` | `2026-04-21` |

## Files emitted (relative to `ux/validate/`)

```
[[ name ]].yaml   — validation schema
```

## Conventions

- Schema name (top-level key) must match the view slug it validates.
- Field `type` values: `string`, `number`, `boolean`, `email`, `url`, `date`.
- `required: true` fails on empty / null / undefined.
- `minLength` / `maxLength` apply to strings; `min` / `max` to numbers.
- `pattern` accepts a regex string (no slashes, no flags).
- i18n error messages reference keys from the `errors` namespace in locale files.
- Validation runs client-side in the FSM before `invoke`; server validation is separate.

## Schema shape

```yaml
[[ name ]]:
  fields:
    fieldName:
      type: string
      required: true
      minLength: 2
      maxLength: 100
    email:
      type: email
      required: true
    age:
      type: number
      min: 18
      max: 120
```

## Example invocation

```bash
ux3 generate validation login
ux3 generate validation registration
```
