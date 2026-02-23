# RENDER.md — Web Components & Slots (Design)


## Goals 🎯
- Provide **clear, reliable, and flexible** patterns for component authors and consumers to compose UIs.
- Avoid implementation bias: recommend standard, composable primitives that work with Shadow DOM, Light DOM, and server rendering.
- Ensure good **accessibility**, **styling encapsulation**, and **performance**.

---

## Principles 💡
- **Explicit composition:** Prefer named slots for distinct insertion points. Default slots are for general content.
- **Single responsibility:** Components should manage structure and behavior; content (markup) stays with the consumer.
- **Predictable lifecycle:** Slot changes are deterministic — rely on `slotchange` and `assignedNodes()` for updates.
- **Styling surface:** Expose styling via CSS custom properties and `part` attributes; avoid leaking internals.
- **Accessible by default:** Components should be keyboard navigable, support form participation (ElementInternals when needed), and forward ARIA semantics.

---

## Core concepts and patterns 🔧

### 1) Slot types & naming
- Use **named slots** for distinct roles: e.g., `slot="header"`, `slot="item"`, `slot="actions"`.
- Reserve the **default slot** for free-form content or an accessible fallback.
- Use **explicit fallback content** inside `<slot>` elements so components are usable without slotted content.

### 2) Content vs. Data (scoped-slot problem)
- Standard slots pass DOM, not data. For cases where slotted templates need data, prefer one of these patterns:
  - **Template stamping**: consumer provides a `<template slot="item">` that the component clones and stamps with supplied data (safe, declarative).
  - **Event-based binding**: component dispatches an event (e.g., `request-data`) that slotted content listens to and updates itself.
  - **Property injection**: component sets a property on slotted nodes after assignment (use carefully — document mutation semantics).

### 3) Re-slotting / forwarding
- Support simple forwarding patterns (e.g., a list component that accepts `<ul slot>` or `<template slot>`), but document behavior for multiple assignment and nested slots.
- Avoid heavy reliance on re-slotting across multiple shadow boundaries — it complicates reactivity and testing.

### 4) Styling & theming
- Components MUST not include inline CSS in templates; styling comes from compositions (`ux-style`), tokens, and component styles.
- Use `ux-style="<key>"` in templates to map to a generated host class (`ux-style-<key>`) and resolved composition classes (Tailwind utilities or classes from YAML). This keeps templates declarative and enables SSR parity.
- Use `part` attributes and CSS custom properties for intention-based styling. Example: `part="item"` + `--component-item-gap`. Expose a small documented set of parts and avoid overexposure.
- Prefer CSS custom properties (`--...`) for themable values, and avoid deep `::slotted()` selectors for theming; use `::part()` for structure-level overrides.
- Tailwind note: generated utility classes must be discoverable by Tailwind's purge step — add safelist or emit classes to scanned files. Document this in the cookbook.

Example (no CSS in template):
```html
<header part="start" ux-style="widget-start"><slot name="start"></slot></header>
<nav part="actions" ux-style="widget-actions"><slot name="actions"></slot></nav>
```
Consumer theming example:
```css
:root { --action-gap: 12px; }
my-action-bar::part(actions) { gap: var(--action-gap); }
/* generated class from ux-style */
.my-action-bar.ux-style-widget { /* token-based base styles injected at build time */ }
```

### 5) Accessibility
- Components exposing form-like behavior should implement Form-Associated Custom Elements (ElementInternals) or map inputs into the effective form.
- Use `delegatesFocus: true` when the host should forward focus to an internal input.
- Ensure ARIA attributes are settable by consumers and forwarded appropriately.

---

## API sketches (examples) — declarative and composable

### Example: Simple list with slot-based items (template stamping)
```html
<my-list items='[{"id":1,"label":"A"}]'>
  <template slot="item">
    <div class="item">{{label}}</div>
  </template>
</my-list>
```
Implementation notes (not prescriptive): component reads the `<template slot="item">`, clones and fills placeholders, or offers a small templating helper. Alternatively dispatch `item-render` events so consumer controls DOM.

### Example: Action bar (named slots + fallback)
```html
<action-bar>
  <button slot="start">Back</button>
  <h1 slot="center">Title</h1>
  <!-- actions fallback: if slot is empty, the component renders a default save button -->
</action-bar>
```

---

## Lifecycle & performance considerations ⚡
- Avoid heavy work in `slotchange` handlers; batch DOM reads/writes (microtask or rAF).
- Use `assignedNodes({flatten:true})` only when necessary; prefer `assignedElements()` where supported.
- Defer expensive stamping until content is visible (lazy rendering) when lists or repeated items are large.

---

## SSR & Polyfills 🧭
- Server-rendered markup must be valid when hydrating; provide predictable fallback content.
- Document how components should behave without Shadow DOM (Shady DOM / no-shadow fallback) to support older environments.

---

## Testing checklist ✅
- Slot assignment tests: verify `slotchange`, `assignedNodes()` and expected DOM output.
- Accessibility tests: keyboard navigation, ARIA roles, form participation, focus behavior.
- Styling tests: parts & custom properties applied and overrideable by consumer CSS.
- Performance tests: render large lists with template stamping and measure frame budgets.

---

## Trade-offs & decisions ⚖️
- Avoid inventing a proprietary scoped-slots DSL; prefer standard templates + small helper APIs.
- Exposing mutation of slotted nodes (host writes to slotted content) increases coupling — only use when necessary and document clearly.

---

## Next steps / Implementation plan 🔜
1. Update IAM **reference app** demonstrating patterns.
2. Add unit tests and accessibility checks for home page (check for app, layout and view).

### References & inspirations
- Web Components spec (slots, shadow DOM, element internals)
- Best practices from major component libraries (accessibility, theming, slot usage)



