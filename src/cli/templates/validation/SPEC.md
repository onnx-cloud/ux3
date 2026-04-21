# UX Validation Hints

`ux/validate/` contains declarative validation schemas for forms and user inputs.

## What belongs here

- Validation definitions grouped by form or view intent.
- Field-level constraints (required, type, range, pattern).
- Message keys that map to i18n resources.

## Validation behavior

- Client validation should fail fast before invoking async side effects.
- Validation should be deterministic and not depend on network state.
- Server-side validation still matters; client validation is for UX and early feedback.

## Authoring conventions

- Keep schema naming aligned with the view/form domain.
- Use explicit field types (`string`, `number`, `email`, `url`, `date`, `boolean`).
- Use `minLength`/`maxLength` for strings and `min`/`max` for numbers.
- Use regex `pattern` sparingly and document intent in comments when complex.

## Error messaging

- Prefer i18n keys over hardcoded prose.
- Keep messages specific to the failed constraint.
- Reuse common error keys where semantics are identical.

## Reference shape

```yaml
registration:
  fields:
    username:
      type: string
      required: true
      minLength: 3
      maxLength: 32
    email:
      type: email
      required: true
    age:
      type: number
      min: 18
      max: 120
```
