# Form Field — App Guidance

Purpose
---
Describe the recommended pattern for form-associated custom elements in App and fallbacks for browsers without `ElementInternals`.

Usage
---
Author example:
```html
<form id="f">
  <form-field name="email">
    <input slot="control" type="email" />
  </form-field>
</form>
```
Component expectations
---
- Use `ElementInternals` if available and call `this.internals.setFormValue()` to serialize values.
- Provide a light-DOM fallback that finds a slotted `<input>` and ensures its `name` matches the host form field semantics.
- Ensure `delegatesFocus: true` when the host should forward focus to slotted inputs.

Testing
---
- Integration tests showing `form.submit()` includes the custom element value.
- Accessibility checks for label association and keyboard navigation.

Reference
---
- Project tasks: `todo/TODO.md` (FormFieldWidget)
