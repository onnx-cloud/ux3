# UX I18N Hints

`ux/i18n/` contains locale bundles used by templates, views, and validation messages.

## What belongs here

- One YAML file per locale (`en.yaml`, `fr-CA.yaml`, etc.).
- Human-facing text only. Keep behavior, branching, and markup out of locale files.

## Localization rules

- Use valid BCP-47 locale tags for file names.
- Keep key structure consistent across locales.
- Prefer semantic key groups (`common`, `errors`, `nav`, `forms`).
- Avoid string concatenation patterns that break in other languages.

## Quality guidelines

- Every key used in templates should exist in every active locale.
- Keep error messages and labels concise and context-aware.
- Use plural-aware structures when count-sensitive text is needed.
- Do not embed HTML; let templates control markup.

## Reference shape

```yaml
common:
  submit: Submit
  cancel: Cancel
  loading: Loading...
errors:
  required: This field is required.
  invalid: Invalid value.
nav:
  home: Home
```
