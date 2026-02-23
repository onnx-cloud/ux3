# Copilot Instructions — UX3 Framework

- UX3 is an FSM-driven web-component framework that compiles YAML+HTML views into typed TypeScript components.
- Build & tests use the repo `package.json` scripts (Node >= 18). Primary scripts: `npm run dev`, `npm run build`, `npm run test`, `npm run test:e2e`.
- Compiler CLI: `ux3 compile --views ./src/ux/view --output ./src/generated` or `ux3 compile --config ./ux3.config.json`.

---

## Big picture (why & how)
- Runtime is small and deterministic: FSMs (state machines) drive visibility and events; views subscribe to FSMs and render declaratively.
- Compilation-first: templates and view YAMLs are analyzed at build-time to generate strongly-typed view components (`src/generated/*`). Do not edit generated files — change the source YAML/HTML.
- Reactive system is proxy-based (`src/state/reactive.ts`) and used by components for fine-grained updates.

---

## Key files & where to look
- Architecture: `ARCHITECTURE.md`, `IMPLEMENTATION.md` (good grounding docs)
- FSM core: `src/fsm/registry.ts` (register/get/validation) and `src/fsm/state-machine.ts`
- Base UI: `src/ui/view-component.ts` (lifecycle, visibility, mount/render hooks)
- Compiler: `src/build/view-compiler.ts` and CLI: `src/cli/compile.ts`
- Generated output: `src/generated/` (auto-generated components & types)
- Reactive primitives: `src/state/reactive.ts` (`reactive`, `effect`, `computed`, `batch`)
- Security helpers: `src/security/sanitizer.ts` (use `escapeHtml`, `sanitizeHtml`, `sanitizeUrl`)
- Example app: `examples/todo/` and `examples/iam/`

---

## Project-specific conventions (concrete rules)
- UI is data-first: styles live in `ux/style/*`, tokens in `ux/token/*`, and texts in `ux/i18n/*` (no hard-coded UI text).
- Views declared as YAML + HTML; templates use `{{...}}`, `ux-event`, `ux-if`, `ux-repeat`, `ux-style`, `ux-state` and `:params` bindings (see `ARCHITECTURE.md` for pattern examples).
- **HTMX is not used in this project** — remove `hx-*` attributes and replace with UX3 patterns:
  - Use `ux-event` for declarative events (buttons, clicks, etc.).
  - Use standard anchor `href` navigation or dispatch `NAVIGATE` events for SPA routing; do not rely on `hx-push-url`.
  - Forms should use `ux-event` on submit handlers and be processed by FSM invokes/services rather than `hx-post`.

### Schema & View YAML 🔧
- Schema files live in `schema/`. Key files: `view.schema.json`, `routes.schema.json`, `services.schema.json`, `style.schema.json`, `tokens.schema.json`, `i18n.schema.json`.
- View YAML essentials:
  - `initial`: string name of the initial state.
  - `states`: object where each key is a state name and the value is either:
    - **Short form**: a string template path, e.g.

      ```yaml
      states:
        idle: 'view/login/idle.html'
      ```

    - **Long form**: an object with `template`, optional `invoke` and `on` blocks, e.g.

      ```yaml
      submitting:
        template: 'view/login/submitting.html'
        invoke:
          src: submitLogin
        on:
          SUCCESS: success
          ERROR: error
      ```

  - `invoke` supports two shapes: `{ src: string, input?: any }` or `{ service: string, method: string, input?: any }`.
  - `on` maps events to either a target state string or a transition object (e.g., `{ target: 'error', guard: 'ctx.count > 0' }`).
- Workflow notes:
  - Edit YAML and templates (under `ux/`) — do not modify generated output in `src/generated/`.
  - Run `npx ux3 compile` or `npm run build` to regenerate types and run validators.
  - Validators perform schema (AJV) checks and extra static validations (FSM reachability, template refs, guard expressions, i18n completeness).
  - Validation strictness: by default validators return warnings (non-fatal). To fail fast on warnings use strict mode:
    - Programmatic: `new Validator({ projectDir, schemas, failOnWarnings: true })` will promote warnings to errors.
    - CLI: `npx tsx src/cli/validate.ts --projectDir ./examples/iam --strict` will exit non-zero when warnings exist.
- FSM usage: events are sent with `fsm.send('EVENT', payload)`; components match `ux-state` to FSM states for visibility.
- Everything that can be verified at build-time is verified at build-time (events, states, style keys, type generation).
- Security: avoid `innerHTML` and prefer `textContent` or `sanitizeHtml()` when receiving or rendering user HTML.

---

## Developer workflows & commands (practical)
- Local dev (TypeScript watch): `npm run dev`
- Build (production): `npm run build` (runs `tsc`, then size-check)
- CI / prepublish full flow: `npm run gold` (build, tests, size-check, minify)
- Unit tests: `npm run test` (Vitest); watch: `npm run test:watch`
- E2E tests: `npm run test:e2e` (Playwright) — debug with `npm run test:e2e:debug` or `npm run test:e2e:ui`
- Compile views manually: `npx tsx src/cli/cli.ts compile --views ./src/ux/view --output ./src/generated` or use alias `ux3 compile` if installed.
- Example runner: `npm run example` or `npm run dev:iam` to start a sample example server.
- Lint & type-check: `npm run lint`, `npm run type-check`.

Note: `CONTRIBUTING.md` references `pnpm` and a monorepo workflow; the repository uses standard `npm` scripts in `package.json` — prefer using `npm` unless a workspace-wide pnpm setup is present.

---

## Testing & debugging tips
- Reset FSM state in tests via `FSMRegistry.clear()` and register test doubles as needed.
- Prefer unit tests for FSM logic and reactive effects (Vitest). Use Playwright for end-to-end behaviour.
- Use `examples/todo/` as a runnable reference for typical FSM & view wiring.

---

## PR checklist for contributors (do before creating PR)
1. Edit source (YAML/HTML/TS) not `src/generated/*`.
2. Run `npm run build` (or `ux3 compile` + `tsc`) to regenerate code and confirm no generation diffs.
3. Run `npm run test` (unit) and `npm run test:e2e` (if you changed UI/behavior).
4. Run `npm run size-check` and `npm run a11y-audit` when relevant.
5. Include a short note in the PR about compilation/generation steps you ran.

---

## Schema & View YAML (details)
- Schemas live in `schema/` and are the source of truth for YAML shape and validation. Key files: `view.schema.json`, `routes.schema.json`, `services.schema.json`, `style.schema.json`, `tokens.schema.json`, `i18n.schema.json`, `validate.schema.json`.

- View schema essentials (see `schema/view.schema.json`): `initial` and `states` are required. `states` is an object where each key is a state name and the value may be either:
  - **Short form**: a string template path, e.g.

    ```yaml
    states:
      idle: 'view/login/idle.html'
      success: 'view/login/success.html'
    ```

    This form is parsed by `ViewCompiler.loadYAML()` and is sufficient when states map directly to templates.

  - **Long form**: an object with `template`, optional `invoke` and `on` blocks, e.g.

    ```yaml
    submitting:
      template: 'view/login/submitting.html'
      invoke:
        src: submitLogin
      on:
        SUCCESS: success
        ERROR: error
    ```

    Notes:
    - `invoke` supports two shapes (per schema): `{ src: string, input?: any }` or `{ service: string, method: string, input?: any }`.
    - `on` maps event names to either a string (target state) or an object (e.g., `{ target: 'error', ... }`). Additional transition metadata (guards/actions) is supported and validated by advanced validators.

- Templates are resolved relative to `ux/view/` and layouts default to `<view>-layout.html` when not specified.

- Validation & tooling:
  - The `Validator` (implemented in `src/build/validator.ts`) runs AJV JSON Schema checks and advanced validators (circular deps, a11y, FSM reachability, guard expressions, i18n completeness).
  - The `build` command (`ux3 build` / `npm run build` when using this repo tooling) loads `schema/*.schema.json` and runs `Validator`; build will fail on validation errors and print file-level messages with suggestions.
  - For view-only generation use `ux3 compile` (`npx tsx src/cli/cli.ts compile`) — this primarily produces code under `generated/views/` and reports missing templates.

- Practical tips when authoring YAML:
  - Prefer short-form state → template mapping for simple UIs; switch to long-form when invoking services or expressing complex transitions.
  - Keep `template` paths exact (the compiler reports missing templates as diagnostics).
  - If you add new schema-driven patterns, update `schema/*.schema.json` and the validator set in `src/build/validator.ts` so changes are checked in CI.

---

If anything here is unclear or you want more detail in a section (examples, CLI flags, or test patterns), tell me which part to expand and I'll iterate. ✅
