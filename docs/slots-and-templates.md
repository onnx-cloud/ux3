# Slots & Template Stamping — App Guide

Purpose
---
Show how to use named slots and template-stamping in the App example App . Focus on predictable lifecycle, SSR parity, security, and testability.

Key rules
---
- Prefer **named slots** for distinct regions: `slot="start"`, `slot="center"`, `slot="actions"`.
- Use explicit fallback content inside `<slot>` to ensure usable SSR output.
- For per-item rendering prefer a slotted `<template slot="item">` that can be stamped by the component at runtime.
- Escape interpolated values by default; opt-in for raw HTML with clear documentation.

Examples
---
Action bar (usage):
```html
<action-bar>
  <button slot="start">Back</button>
  <h1 slot="center">Title</h1>
  <!-- no actions slot -> component does a fallback save button -->
</action-bar>
```
my-list (template stamping):
```html
<my-list :items='{{items}}'>
  <template slot="item">
    <div class="item">{{label}}</div>
  </template>
</my-list>
```

Testing notes
---
- Verify `slotchange` is emitted when slotted content is updated.
- Assert `assignedElements()` returns expected nodes and flattened nodes when nested slots are present.
- For template stamping: assert count of stamped elements and correctness of escaped interpolation.

Security
---
- Default interpolation is escaped. If the template needs raw HTML, require an explicit opt-in flag (e.g., `allowUnsafeHtml`) and document risks.

References
---
- Project-level cookbook: `docs/SLOTS_COOKBOOK.md`
- Implementation tasks: `todo/TODO.md` (see template-stamp and slot-utils tasks)
