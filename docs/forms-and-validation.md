# Forms and Validation

## Canonical form primitives

The UX3 form system uses these core primitives:

- `ux-form` — form container with validation, submission, and reset
- `ux-field` — canonical wrapper for label, hint, and error display
- `ux-input` — text input
- `ux-textarea` — multi-line text input
- `ux-select` — dropdown select
- `ux-combobox` — searchable select with autocomplete
- `ux-checkbox` — boolean checkbox
- `ux-switch` — toggle switch
- `ux-radio-group` — radio button group
- `ux-date-picker` — date input
- `ux-file-upload` — file selection

## UX form contract

### `ux-form`

The form container manages validation across native and custom controls.

```html
<ux-form>
  <ux-form-errors></ux-form-errors>
  <ux-input name="email" required></ux-input>
  <ux-button type="submit">Submit</ux-button>
</ux-form>
```

**Methods:**
- `checkValidity()` — validate without displaying errors
- `reportValidity()` — validate and display errors
- `submit()` — validate then emit `ux:submit` event
- `reset()` — reset all field values and clear errors

**Events:**
- `ux:submit` — emitted with `{ values: Record<string, string> }` on successful submit
- `ux:validated` — emitted with `{ valid, errors }` after validation

### `ux-field`

The canonical wrapper provides label, hint, and error display for any form control.

```html
<ux-field name="email" label="Email" required hint="We'll never share your email">
  <input type="email" />
</ux-field>
```

**Attributes:**
- `name` — field name (used for form value collection)
- `label` — display label (auto-inferred from i18n if not set)
- `type` — input type (default: text)
- `required` — mark field as required
- `disabled` — disable the control
- `error` — current error message
- `touched` — set on blur, controls error visibility
- `hint` — help text below the control

**Events:**
- `ux:form.field.change` — emitted with `{ name, value }` on control change

## Object-driven options

### `ux-select`

```html
<!-- Markup-based options -->
<ux-select name="country">
  <option value="us">United States</option>
  <option value="ca">Canada</option>
</ux-select>

<!-- With placeholder -->
<ux-select name="country" placeholder="Select a country">
  <option value="us">United States</option>
  <option value="ca">Canada</option>
</ux-select>
```

Programmatic binding via `data-from` attribute:

```ts
// In FSM context:
{ country: {
  value: 'ca',
  options: [
    { label: 'United States', value: 'us' },
    { label: 'Canada', value: 'ca', disabled: true },
  ]
} }
```

```html
<ux-select name="country" data-from="country"></ux-select>
```

### `ux-combobox`

```html
<!-- Markup-based options -->
<ux-combobox name="city">
  <option value="london">London</option>
  <option value="paris">Paris</option>
</ux-combobox>
```

Data-driven:

```ts
{
  value: 'paris',
  options: [
    { label: 'London', value: 'london' },
    { label: 'Paris', value: 'paris' },
    { label: 'Berlin', value: 'berlin', disabled: true },
  ]
}
```

### `ux-radio-group`

```html
<!-- Comma-separated options -->
<ux-radio-group name="size" options="Small,Medium,Large"></ux-radio-group>

<!-- JSON options -->
<ux-radio-group name="color" options='[{"label":"Red","value":"red"},{"label":"Blue","value":"blue"}]'></ux-radio-group>

<!-- Options with data variant -->
<ux-radio-group name="layout" data-variant="stacked" options="Vertical,Horizontal"></ux-radio-group>
```

Data-driven:

```ts
{
  value: 'blue',
  options: [
    { label: 'Red', value: 'red' },
    { label: 'Blue', value: 'blue' },
    { label: 'Green', value: 'green', disabled: true },
  ]
}
```

Keyboard navigation: Arrow keys (Up/Down/Left/Right) navigate between options.

## Form validation

```ts
// Form validation contract
form.checkValidity();   // Returns boolean, no UI change
form.reportValidity();  // Returns boolean, shows errors
form.submit();          // Validates then emits ux:submit
form.reset();           // Clears all values and errors
```

Required fields must have a non-empty value. The form validates:
- Native `<input>`, `<textarea>`, `<select>` elements
- `ux-input`, `ux-textarea`, `ux-select`, `ux-combobox`
- `ux-checkbox`, `ux-switch` (checked state)
- `ux-radio-group` (selected value)
- `ux-date-picker`, `ux-file-upload`, `ux-search-bar`, `ux-slider`

Error display:

```html
<ux-form>
  <ux-form-errors></ux-form-errors>
  <!-- fields -->
</ux-form>
```

Errors are rendered into the `ux-form-errors` container with field name and message.

## Accessibility

- `ux-radio-group` uses `role="radiogroup"` with arrow key navigation
- `ux-combobox` uses `role="combobox"`, `role="listbox"`, and `aria-activedescendant` patterns
- `ux-field` links labels via `for`/`id` and announces errors via `aria-describedby`
- Error text uses `role="alert"` for screen reader announcement
- Required fields expose `aria-required="true"`

## Widget registration

Both core and plugin widgets register through the same shared registry:

```ts
import { registerWidget } from '@ux3/ux-primitives';
// or
import { registerWidget } from '@ux3/ui';

registerWidget({
  tag: 'ux-my-plugin-widget',
  role: 'region',
  kind: 'region',
  family: 'layout',
});
```

Query widget metadata:

```ts
import { resolveWidgetMetadata } from '@ux3/ui';

const meta = resolveWidgetMetadata('ux-input');
// { tag: 'ux-input', role: 'textbox', kind: 'input' }
```

## Styling

Form controls are styled via CSS custom properties and light DOM with `registerLightStyle`:

```css
/* Override via CSS custom properties */
ux-input {
  --ux-input-text: #0f172a;
  --ux-input-bg: #ffffff;
  --ux-input-border-color: #cbd5e1;
  --ux-input-radius: 0.375rem;
  --ux-input-padding: 0.5rem 0.75rem;
  --ux-input-focus-border: #2563eb;
}

ux-select {
  --color-text: #0f172a;
  --color-bg: #fff;
  --color-border: #d1d5db;
  --color-primary: #6b7280;
}
```

The `ux-field` wrapper uses shadow DOM with custom properties for isolated field structure:

```css
ux-field {
  --field-spacing: 1rem;
  --field-label-color: #1f2937;
  --field-error-color: #dc2626;
  --control-padding: 0.5rem 0.75rem;
  --control-border: #d1d5db;
  --control-focus-border: #3b82f6;
}
```

## Test guidance

- Unit-test validators via form `checkValidity()` and `reportValidity()`
- Integration-test submit flows with `ux:submit` event capture
- Test field-level error display via `ux-field` error attribute
- Verify radio group keyboard navigation
- Verify combobox ARIA patterns and option filtering
- Add E2E coverage for critical form journeys
