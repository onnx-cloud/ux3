# Testing Guides — App component tests

Purpose
---
Practical test patterns for the App example App : unit tests for utilities, and integration tests for component behavior and SSR parity.

Unit tests
---
- `slot-utils`: test `observeSlot` batching and `getAssignedElements` flatten behavior.
- `template-stamp`: test `renderTemplateString` (SSR) and `stampTemplate` (DOM) including HTML escaping.
- `ViewCompiler`: test that `ux-style` resolves to `class="ux-style-<key> <classes>"` and preserves `part` attributes.

Integration tests
---
- `action-bar`: verify fallback actions, named slot assignment, `::part()` styling, and token overrides.
- `my-list`: verify template-stamping equals SSR output, correct counts for large arrays, and lazy rendering if implemented.
- Form-field: verify `ElementInternals` participation or fallback behaviour.

E2E & a11y
---
- Use Playwright to run accessibility audits on key flows (home view, login flow) and ensure components are usable via keyboard and screen readers.

Reference
---
- See `todo/TODO.md` for concrete test targets.
