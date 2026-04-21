# Template: `i18n`

Used by: `ux3 generate i18n <locale>`

## Tokens

| Token | Example |
|---|---|
| `[[ name ]]` | `en` or `fr-CA` (the locale tag, passed as the name argument) |
| `[[ date ]]` | `2026-04-21` |

## Files emitted (relative to `ux/i18n/`)

```
[[ name ]].yaml   — locale strings bundle
```

## Conventions

- File name MUST be the BCP-47 locale tag (e.g. `en`, `en-US`, `fr-CA`).
- Keys use dot-path grouping: `section.key`.
- Never embed raw HTML in i18n strings.
- Pluralisation: use `one` / `other` sub-keys when needed.
- Missing keys fall through to the default locale (usually `en`).
- All keys referenced in templates must exist in every locale file.

## File shape

```yaml
# [[ name ]].yaml — i18n strings
common:
  submit: Submit
  cancel: Cancel
  loading: Loading…
  back: Back
errors:
  required: This field is required.
  invalid: Invalid value.
  server: Something went wrong. Please try again.
nav:
  home: Home
```

## Example invocation

```bash
ux3 generate i18n en
ux3 generate i18n fr-CA
ux3 generate i18n de
```
