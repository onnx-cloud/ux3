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

Declarative scenario tests
---
- Use YAML-based scenarios (`tests/decl/*.yaml`) to describe high‑level flows.
- Runner (`src/test-tools/decl-runner.ts`) parses steps and drives either a unit FSM sandbox or a Playwright page.
- Steps include `event`, `click`, `input`, `wait`, `assert`, `assertState`, and `fsmState`.
- Allows cross‑layer reuse: the same file can power unit and E2E specs.
- See `tests/decl/runner.test.ts` for a minimal example and `todo/DECL_TESTS.md` for DSL documentation.
- A Playwright fixture (`tests/e2e/decl-fixtures.ts`) injects a `window.__test` helper so scenarios can emit events/get state in-browser; see `tests/e2e/decl.spec.ts` for usage.

E2E & a11y
---
- Use Playwright to run accessibility audits on key flows (home view, login flow) and ensure components are usable via keyboard and screen readers.

Reference
---
- See `todo/TODO.md` for concrete test targets.
