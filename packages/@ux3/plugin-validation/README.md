# @ux3/plugin-validation

Validation plugin for UX3.

## Features

- Runtime data validation utilities
- Declarative rule support for forms and services
- Shared validation API for UX3 apps
- Schema-based validation helpers

## Installation

```bash
npm install @ux3/plugin-validation
```

## Basic Usage

```ts
import ValidationPlugin from '@ux3/plugin-validation';

const app = initializeApp({
  plugins: [ValidationPlugin],
});
```

## Plugin Usage

- Register the plugin in your UX3 app.
- Use `app.utils.validate` for field and value validation.
- Optionally add validation rules to form services.

## API

- `app.utils.validate(rules, value)` — validate a value against a rule set.

## Example

```ts
const error = app.utils.validate({ required: true, email: true }, 'hello@example.com');

if (error) {
  console.error('Validation failed:', error);
} else {
  console.log('Validation passed');
}
```

## Notes

- Rules support `required`, `minLength`, `maxLength`, `pattern`, `email`, and `url`.
- The plugin also augments UX3 form validation services, if present.
