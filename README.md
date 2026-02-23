# UX3 — Idiomatic Development Guide (Simplified)

**UX3 favors configuration first, code only when necessary.**
Describe the UI as data; use code as an escape hatch.

---

## Core Principles

1. **Declare, Don’t Imperative** — say *what* the UI is, not *how* to build it
2. **Concerns Are Modular** — `token/ view/ style/ route/ page/ layout/ validation/ i18n/`
3. **Compile > Interpret** — push complexity to build-time
4. **Composable by Default** — widgets nest and reuse easily
5. **Types Everywhere** — full TypeScript coverage

---

## Project Structure & Contexts

* Each top-level folder = a **concern** supported by the framework.
* Concerns are available in the **`app` context**.
* Three main contexts: **`app`**, **`route`**, **`view`**.
* Inside views, data/params are **`this`** for ergonomics.
* Concern subfolders merge into a global namespace.
* Routes map to named views in `ux/view/`.
* At render:

  * Route params → `route.params`
  * Widget `this` defaults to route params unless overridden.
* Views define an **FSM** with `states` and `initial` (must be valid).
* Optional `template` points to HTML.
* Template tags with `ux-state=` render only when matched.
* FSM `invoke` handles side-effects (data loading, etc.), using a UX3-specific syntax.

---

## Idiomatic Checklist

* Widgets = **template + behavior only** (no styles)
* All styles in `ux/style/`, referenced by widget name
* Validation = **rules only**, no text
* All user text in `ux/i18n/*.json` (nested)
* All tokens in `ux/token/`, referenced as `$token-name`
* Variants in YAML, not TypeScript conditionals
* Complex views use **FSM**, not imperative logic
* No hard-coded strings
* Types auto-generated from validation + API schemas

---

## Philosophy

**Config Over Code**

* Config = specification
* Code = behavior only
* Prefer build-time over runtime
* Outcome: simpler, faster, type-safe systems

**Goal:** spend time designing, not wiring.

---

## Styling Layout

* Tailwind + named styles
* Tokens define primitives; styles consume tokens; views consume styles.

```
ux/token/{colors,spacing,typography}.yaml
ux/view/{primitive,composition,layout}/*.yaml
ux/style/{primitive,composition,layout}/*.yaml
```

---

## Three Centralization Rules

### 1. Styles: Centralized & Implicit

* **Never embed styles in widgets.**
* Define once in `ux/style/`; reference by widget name.
* Benefit: single source of truth, clean variants, pure data.

### 2. Text: Centralized in i18n

* **No user text in widgets or validation.**
* Nested JSON mirrors app structure.
* Benefit: maintainable and translatable.

### 3. Validation: Rules Only

* **Schemas contain constraints, not messages.**
* Messages live in i18n.
* Benefit: clean separation of data vs. content.

---

## Idiomatic Patterns

**Everything Is Data**
UI, style, validation, and state are declarative artifacts.

**Token-Based Design**
Styles reference `$tokens`, not literals.

**Variants Over Conditionals**
Use YAML variant maps instead of `if` branches.

**FSM for State**
Views model lifecycle and effects explicitly.

---

## Common Workflows

### Add a Widget

1. Create style in `ux/style/...`
2. Create template HTML
3. Create view YAML
4. Style auto-applies by name

### Add Validation

1. Define rules in `ux/validation/...`
2. Add messages in `ux/i18n/...`
3. Compiler generates TypeScript types
4. Consume with full type safety

### Add i18n Keys

* Extend nested JSON under `ux/i18n/`.
* Structure mirrors routes/views.

---

## Modular Config Architecture

All UX3 projects use a `ux/` directory organized **by concern**, not by feature.
Each concern stays small, mergeable, and globally addressable—no monolithic files.
