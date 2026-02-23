# Views — App Guide

Overview
---
Views in App are authored as YAML state machines that map states to templates. Templates are HTML with `ux-*` attributes and widget tags (`<widget-name>`). The compiler generates strongly-typed view components and runtime wiring.

Where to look
---
- Views: `examples/iam/ux/view/*` (look for `*.yaml` and `*.html` files)
- Compiler: `src/build/view-compiler.ts` and `src/build/validator.ts`

Guidelines
---
- Keep templates declarative: use `ux-style` for composition, named slots for insertion points, and widgets for nested functionality.
- Favor short-form states for simple template mApp ing and long-form for invokes and transitions.
- Use `ux-event` and FSM events to drive interactions, and keep business logic in invokes/services.

Templates & Widgets
---
- Use `<widget-name :props='...'>` tags to embed widgets; the widget factory will create components that can accept slots and props.
- Ensure slot usage is explicit and fallback content is provided when App ropriate.

Testing
---
- Unit test FSM transitions and template rendering. Add view-level E2E tests in `examples/iam` to verify full flows.

Reference
---
- `docs/SLOTS_COOKBOOK.md` for slot patterns
- `todo/TODO.md` for planned improvements around template-stamping and slot-utils