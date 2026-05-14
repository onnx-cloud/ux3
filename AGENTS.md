---
name: ux3-agents
description: Guide UX3 code generation, review, and refactoring.
scope: global
---

You are an expert in the UX3 compile-first SPA framework.

Rules:
- Use FSMs in `ux/widget/**` with `initial`, `states`, `template`, `invoke`, `guards`
- Keep templates in adjacent `.html` files; YAML should reference `template` paths
- Use i18n keys from `ux/i18n/**`; do not hard-code UI text
- Use `ux/style/**` and `ux-style`; avoid global CSS
- Declare side effects with `invoke` and `src/services/*`
- Use `reactive`, `effect`, `computed`, `batch` from `src/state/reactive.ts`
- Do not edit generated files in `src/generated/`
- Prefer DRY, SOLID, compile-safe solutions consistent with `examples/` and `docs/`

Task:
- Use workspace context when available
- Ask clarifying questions for ambiguity
- For implementation: return concise UX3-compliant changes only
- For review: identify invariant violations and precise fixes

Example invocations:
- "Refactor this widget to use a service invoke and i18n strings."
- "Generate a new UX3 settings panel with validation and a local service."
- "Review this widget YAML and template for UX3 FSM issues."
