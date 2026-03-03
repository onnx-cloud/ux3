# UX3 Forms System

A pragmatic, FSM-native form system for UX3 that provides:
- **Web Components** (`<ux-field>`, `<ux-field-array>`) for encapsulated form fields
- **Rule Engine** for composable, async-capable validation
- **FSM Helpers** for form state management within FSM contexts
- **Type-safe schemas** with built-in validation rules

## Quick Start

### 1. Import the Form Plugin

```typescript
import { FormPlugin } from '@ux3/plugins';

// Auto-registers ux-field and ux-field-array components
app.use(FormPlugin, { autoRegister: true });
```

### 2. Define a Form with UxField

```html
<form ux-event="SUBMIT">
  <ux-field
    name="email"
    type="email"
    required
    error="{{ctx.errors.email}}"
    touched="{{ctx.touched.email}}"
  >
    <input slot="control" />
  </ux-field>

  <ux-field
    name="password"
    type="password"
    required
    error="{{ctx.errors.password}}"
    touched="{{ctx.touched.password}}"
  >
    <input slot="control" />
  </ux-field>

  <button type="submit">Sign In</button>
</form>
```

### 3. Create FSM with Form Context

```yaml
name: Login
initial: idle

context:
  form:
    email: ''
    password: ''
  errors: {}
  touched: {}
  dirty: {}
  isSubmitting: false

states:
  idle:
    template: 'view/login/idle.html'
  submitting:
    invoke:
      service: auth
      method: login
      input:
        form: ctx.form
    on:
      SUCCESS: success
      ERROR: error
```

## Components

### `<ux-field>`

Encapsulated form field component with built-in accessibility and styling.

**Props:**
- `name` - Field name (required)
- `type` - Input type (text, email, password, checkbox, etc.) - default: text
- `label` - Custom label (auto-inferred from i18n if not provided)
- `required` - Mark as required
- `disabled` - Disable the field
- `error` - Error message to display
- `touched` - Whether field has been interacted with
- `hint` - Helper text below label

**Attributes:**
- `data-context` - Form context for label inference (e.g., "register", "profile")

**Slot:**
- `control` - The actual input element

**Events:**
- `field-change` - Fired when field value changes
- `field-blur` - Fired when field loses focus

### `<ux-field-array>`

Component for managing repeated fields (e.g., multiple addresses).

**Props:**
- `name` - Field array name
- `context` - Form context for nested fields

**Slot:**
- `item` - Template for array items

**Methods:**
- `addItem(data?)` - Add new item
- `removeItem(element)` - Remove item
- `getValues()` - Get all values
- `getItemCount()` - Get number of items

## Validation System

### RuleEngine Class

```typescript
import { RuleEngine } from '@ux3/validation';

const engine = new RuleEngine();

// Validate single value
const result = await engine.validate('user@example.com', {
  type: 'email',
  message: 'Invalid email'
});

// Validate field against multiple rules
const fieldResult = await engine.validateField(
  'email',
  'user@example.com',
  [
    { type: 'required', message: 'Email is required' },
    { type: 'email', message: 'Invalid email format' },
    { type: 'emailUnique', message: 'Email already registered', debounce: 500 }
  ]
);

// Validate entire form
const formResult = await engine.validateForm(
  { email: 'user@example.com', password: 'secret123' },
  {
    email: [{ type: 'required' }, { type: 'email' }],
    password: [{ type: 'required' }, { type: 'minLength', config: { minLength: 8 } }]
  }
);
```

### Built-in Rules

**Basic:**
- `required` - Value is not empty
- `minLength` / `maxLength` - String/array length validation
- `min` / `max` - Numeric value validation

**Format:**
- `email` - Valid email format
- `url` - Valid URL format
- `pattern` - Regex pattern matching
- `integer` - Integer validation
- `number` - Numeric validation
- `date` - Valid date validation

**Cross-field:**
- `matches` - Field matches another field (e.g., password confirmation)

**Custom:**
- `custom` - Custom validator function
- `emailUnique` - Async: check email uniqueness
- `usernameAvailable` - Async: check username availability

### Custom Rules Example

```typescript
import { rules } from '@ux3/validation';

const customRules = {
  ...rules,
  passwordStrength: (value: string) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]{8,}$/.test(value);
  },
  serverValidation: async (value: string) => {
    const resp = await fetch(`/api/validate/${value}`);
    return resp.ok;
  }
};
```

## FSM Integration

### Form Actions

Update form state within FSM:

```typescript
import { formActions } from '@ux3/fsm';

formActions.updateFormField(ctx, 'email', 'user@example.com');
formActions.touchField(ctx, 'email');
formActions.setFieldError(ctx, 'email', 'Invalid email');
formActions.setErrors(ctx, { email: 'Invalid', password: 'Too short' });
formActions.resetForm(ctx);
formActions.touchAll(ctx); // Mark all as touched
formActions.setSubmitting(ctx, true);
```

### Form Guards

Check form state before transitions:

```typescript
import { formGuards } from '@ux3/fsm';

formGuards.hasNoErrors(ctx); // Check if no validation errors
formGuards.isDirty(ctx); // Check if any field changed
formGuards.canSubmit(ctx); // Check if form is ready to submit
formGuards.fieldHasError(ctx, 'email');
formGuards.fieldIsTouched(ctx, 'email');
formGuards.fieldMatches(ctx, 'password', 'confirmPassword');
formGuards.isPristine(ctx); // Check if no changes
```

## I18n Integration

Labels and error messages are auto-inferred from i18n keys:

```json
{
  "register": {
    "fields": {
      "email": {
        "label": "Email Address",
        "placeholder": "Enter your email",
        "hint": "We'll never share your email"
      },
      "password": {
        "label": "Password",
        "placeholder": "Create a strong password",
        "hint": "At least 8 characters, 1 uppercase, 1 number"
      }
    }
  }
}
```

**Label Inference Priority:**
1. Explicit `label` attribute
2. `context` attribute → `i18n.{context}.fields.{name}.label`
3. `data-context` on parent → same as above
4. Parent `ux-style` attribute → auto-extract context (`form-register` → `register`)
5. Fallback to `i18n.common.fields.{name}.label`

## Advanced Patterns

### Multi-Step Form

```yaml
states:
  step1:
    template: 'view/checkout/step1.html'
    on:
      NEXT:
        guard: |
          return formGuards.hasNoErrors(ctx) && ctx.form.email;
        target: step2

  step2:
    template: 'view/checkout/step2.html'
    on:
      PREVIOUS: step1
      SUBMIT: submitting
```

### Conditional Fields

```html
<!-- Show frequency field only if newsletter is true -->
<div ux-if="{{ctx.form.newsletter}}">
  <ux-field name="frequency">
    <select slot="control">
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
    </select>
  </ux-field>
</div>
```

### Dynamic Field Arrays

```html
<ux-field-array name="addresses" context="shipping">
  <template slot="item">
    <ux-field name="street">
      <input slot="control" />
    </ux-field>
    <ux-field name="city">
      <input slot="control" />
    </ux-field>
  </template>
</ux-field-array>

<button ux-event="ADD_ADDRESS">Add Another Address</button>
```

## Testing

### Unit Testing Form Validation

```typescript
import { describe, it, expect } from 'vitest';
import { RuleEngine } from '@ux3/validation';

describe('Form Validation', () => {
  const engine = new RuleEngine();

  it('should validate email', async () => {
    const result = await engine.validate('user@example.com', {
      type: 'email'
    });
    expect(result.valid).toBe(true);
  });

  it('should validate required field', async () => {
    const result = await engine.validate('', {
      type: 'required'
    });
    expect(result.valid).toBe(false);
  });
});
```

### Component Testing with Playwright

```typescript
import { test, expect } from '@playwright/test';

test('register form', async ({ page }) => {
  await page.goto('/register');

  // Fill form
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'SecurePass123');
  await page.fill('[name="confirmPassword"]', 'SecurePass123');
  await page.check('[name="agreeToTerms"]');

  // Submit
  await page.click('button[type="submit"]');

  // Check success state
  await expect(page.locator('text=Account Created')).toBeVisible();
});
```

## Accessibility

The form system is built with accessibility in mind:

- Proper `<label>` associations
- `aria-invalid` for invalid fields
- `aria-required` for required fields
- `aria-describedby` linking fields to errors
- Error messages use `role="alert"`
- Keyboard navigation support
- Focus management

## Performance

- **Bundle size**: ~20KB gzipped (UxField + RuleEngine)
- **Validation**: <10ms for typical form (8-10 fields)
- **Debouncing**: Configurable debounce for async rules (default 300ms)
- **No runtime overhead**: Minimal re-renders via reactive state

## Browser Support

- Modern browsers with Web Components support
- ElementInternals for proper form association
- Fallback for older browsers via polyfills

## API Reference

### RuleEngine API

```typescript
class RuleEngine {
  // Validate single value
  validate(value: any, rule: ValidationRule, context?: Record<string, any>): Promise<ValidationResult>

  // Validate field against rules
  validateField(name: string, value: any, rules: ValidationRule[], context?: Record<string, any>): Promise<FieldValidationResult>

  // Validate entire form
  validateForm(data: Record<string, any>, schema: Record<string, ValidationRule[]>, context?: Record<string, any>): Promise<FormValidationResult>

  // Debounced validation (for async rules)
  validateFieldDebounced(name: string, value: any, rules: ValidationRule[], context?: Record<string, any>): Promise<FieldValidationResult>

  // Clear all debounce timers
  clearDebounceTimers(): void

  // Clear cache
  clearCache(): void
}
```

### FormActions

Available in FSM transitions:
- `updateFormField(ctx, name, value)`
- `touchField(ctx, name)`
- `setFieldError(ctx, name, error)`
- `setErrors(ctx, errors)`
- `clearErrors(ctx)`
- `resetForm(ctx)`
- `touchAll(ctx)`
- `setSubmitting(ctx, boolean)`
- `updateForm(ctx, data)`

### FormGuards

Available for transition guards:
- `hasNoErrors(ctx)`
- `isDirty(ctx)`
- `allTouched(ctx)`
- `fieldHasError(ctx, fieldName)`
- `fieldIsTouched(ctx, fieldName)`
- `canSubmit(ctx)`
- `fieldMatches(ctx, fieldName, otherFieldName)`
- `fieldEquals(ctx, fieldName, value)`
- `isPristine(ctx)`

## Examples

See [examples/iam/ux/view/register/](../../examples/iam/ux/view/register/) for a complete register form example.

## Contributing

To add new validation rules:

1. Add rule to `src/validation/rule-library.ts`
2. Add tests to `tests/validation/rule-library.test.ts`
3. Update this documentation

## License

MIT - See LICENSE file for details
