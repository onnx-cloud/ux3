# TODO — Add robust slot & template-stamping support

Goal
---
Bring first-class, documented support for Web Component composition patterns described in `todo/RENDER.md` into the project and the `examples/iam` reference app. Provide runtime helpers, compile-time behavior, docs, and tests for: named slots, template stamping (scoped-template for lists/components), `slotchange` utilities, `part` propagation, and accessibility/form participation patterns.

Scope of work
---
- Work impacting `./src/` (core framework and runtime).
- Work impacting `examples/iam` (reference patterns, demos, tests, and docs).
- Add tests and accessibility checks ensuring predictable behavior across SSR and client rendering.

Why
---
Although widgets and nested rendering exist (see `docs/WIDGET_SYSTEM.md`), the project lacks a clear, supported path for: stamping consumer-provided templates with component data (scoped-template), deterministic slot lifecycle helpers, and composable examples that demonstrate named-slot patterns and fallbacks.

High-level Requirements
---
1. Template stamping API
   - Allow components/widgets to accept a `<template slot="...">` and stamp it for each item in a list with a small, safe templating helper (e.g., simple interpolation of properties supplied by host). Keep it optional and non-opinionated (no heavy templating engine). Respect SSR (render strings server-side when templates are available as strings).

2. Slot lifecycle helpers
   - Provide utility functions to reliably observe and query slot assignments (wrapped `slotchange` handler, `assignedElements()` + flattening, batching/read-write separation).

3. Named slots & fallback behavior
   - Compile and preserve `<slot name="...">` and `<slot>` elements in generated view components and widgets. Provide fallback content behavior and clear docs on multi-assignment semantics.

4. Styling & theming surface
   - Ensure `part` attributes are preserved on compiled widgets/components and document the part surface (names and intent). Provide guidance for mapping internal parts to host-level parts when forwarding components.
   - Implement `ux-style` composition resolution: map `ux-style="<key>"` in templates to a generated host class `ux-style-<key>` and append composition classes (Tailwind utilities or token-derived classes) so SSR and client output match.
   - Emit token → CSS custom properties for compositions (component-scoped styles or a token bundle) and reference these vars from generated component styles. Document recommended override scopes (root/app/host).
   - Tailwind integration: ensure generated utility classes are discoverable by Tailwind (emit classes to files Tailwind scans or provide safelist entries), and add tests to prevent purge issues.
   - Define class-ordering rules: base generated composition classes < consumer `class` overrides; add unit tests asserting override behavior.
   - Add docs and examples showing `ux-style` + `::part()` + CSS vars theming patterns.

5. Accessibility & form participation
   - Provide a pattern and example for form-associated custom elements (ElementInternals), and guidance for `delegatesFocus`. Add a `form-field` widget that participates in a form and a11y tests.

6. Tests & Examples
   - Add unit tests in `src/__tests__/` for runtime utilities and ViewComponent slot behavior. Add E2E or integration tests in `examples/iam` to demonstrate the end-to-end pattern.

Concrete Tasks — Core (`./src/`)
---
- [ ] Add a lightweight `template-stamp` helper (e.g., `src/ui/template-stamp.ts`) with:
  - `renderTemplateString(templateString, context)` for SSR and a DOM stamping helper `stampTemplate(templateElement, context)` that returns cloned nodes.
  - Secure interpolation (escape HTML) and docs about when to accept safe HTML.
  - Unit tests.

- [ ] Extend `Widget`/`ViewComponent` runtime to recognize slotted `<template slot="name">` nodes and provide a small API for components to stamp them with data (e.g., `this.stampSlotTemplate('item', data)` or emit `item-render` events with data payloads so the template can render itself).

- [ ] Add `slot-utils` (e.g., `src/ui/slot-utils.ts`) including:
  - `observeSlot(host: HTMLElement, slotName: string, callback)` — handles `slotchange` + microtask batching.
  - `getAssignedElements(slot: HTMLSlotElement, opts?: {flatten?: boolean})` — normalized wrapper with older browser fallbacks.
  - Tests for correct behavior with nested shadow/light DOM scenarios.

- [ ] Ensure the `ViewCompiler` / `view-compiler.ts` preserves `<slot>` elements in component templates and outputs proper host markup when compiling views (both client + SSR flows). Add tests for template compilation that include slots.

- [ ] Update `ViewCompiler` to resolve `ux-style` → `class="ux-style-<key> <composition-classes>"` and preserve `part` attributes. Add unit tests verifying SSR/client parity and class order/override semantics.

- [ ] Add CSS generation: token → CSS vars output and per-component style bundles (or token bundle) used by runtime and SSR. Add tests ensuring vars are present.

- [ ] Add Tailwind safelist/integration step so generated utility classes are not purged; update tailwind config in `examples/iam` if needed and add tests.

- [ ] Document the `ux-style` mapping, `part` surface, and theming examples in `docs/WIDGET_SYSTEM.md` and `todo/RENDER.md`.

- [ ] Add accessibility helpers & examples:
  - `FormFieldWidget` helper base using `ElementInternals` where supported with fallbacks. Document expected behavior and add tests verifying form value serialization & participation.

- [ ] Validate and add lint/validator checks as necessary to surface common slot misuse (optional): e.g., warn if a view defines `<slot>` but the component is not documented to accept it.

Concrete Tasks — Examples (`examples/iam`)
---
- [ ] Add a small demo widget `action-bar` (under `examples/iam/ux/widgets/`) demonstrating named slots (`start`, `center`, `actions`) and fallback content for `actions`.
  - Update a sample view (e.g., `home/index.html`) to use `action-bar` with and without slotted actions.
  - Add unit/visual tests verifying fallback and slotted content rendering.

- [ ] Add `my-list` widget demonstrating template-stamping:
  - Usage: `<my-list :items='{{items}}'> <template slot="item"> <div class="item">{{label}}</div> </template> </my-list>`
  - Example view using a list of items; both SSR and client rendering should produce equivalent output.
  - Add performance test for large lists (benchmark, or smoke test for lazy stamping).

- [ ] Add `form-field` demo demonstrating form-associated behavior and ensure the `sign-up` or `login` flows use it in a small test.

- [ ] Add integration tests (Vitest + Playwright where applicable) that assert:
  - slot assignments fire `slotchange` and assigned elements are visible to consumers
  - template-stamping produces correct DOM for each item
  - accessibility: tab order, roles, and form participation are correct

Docs & Tests
---
- [ ] Update `docs/WIDGET_SYSTEM.md` with example sections for named slots, template-stamping patterns, and a small API example for the stamp helper.
- [ ] Add `todo/RENDER.md` -> already authored; add a short cookbook entry in `docs/` referencing it.
- [ ] Add tests in `src/__tests__/` for the new utilities and in `examples/iam` for integration.

Backward compatibility & Polyfills
---
- Keep fallback behavior when Shadow DOM is unavailable. Document Polyfill guidance (Shady DOM), and ensure `slot-utils` has graceful fallbacks.
- Avoid forcing a large templating dependency; provide a minimal helper and document recommended opt-in templates.

Acceptance criteria (done when)
---
- New `template-stamp` utility exists with unit tests covering DOM stamping and SSR rendering.
- `slot-utils` exists with unit tests and is used by at least one widget and one compiled view test.
- `examples/iam` contains `action-bar`, `my-list`, and `form-field` demos and tests demonstrating the patterns.
- Docs/WIDGET_SYSTEM.md updated with cookbook examples and usage guidance.
- CI tests (unit + integration) pass for new tests.

Estimate & Prioritization
---
- Minimal MVP (template stamping + demo `my-list`, minimal tests): 2–3 days.
- Full feature set (slot utils, `action-bar`, `form-field`, docs, and integration tests): 4–6 days.

Risks & Notes
---
- Template stamping is a potential XSS vector; keep helper conservative and well-documented about escaping and allowed HTML.
- Interactions across multiple shadow boundaries can be tricky; prefer simple patterns and document the limitations.

Next steps
---
1. Create prototype `template-stamp` and `slot-utils` in `src/` and add unit tests.
2. Add `my-list` demo in `examples/iam` using the new APIs and an integration test.
3. Iterate on UX and docs, and expand tests (a11y, performance).

