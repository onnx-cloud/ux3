# Copilot Instructions — UX3 Framework

UX3 is a tiny, zero‑dependency SPA framework powered by compiled
finite‑state machines. Views are declared in YAML/HTML, compiled at build
time and rendered by a minimal runtime.

## Core concepts

* **Compile‑first** – every UI, schema or style is validated & typed during
  `npm run build` (or `npx ux3 compile`). The compiler lives in
  `src/build/`; generated artifacts land in `src/generated/` and must never
  be edited directly.
* **FSM‑driven UI** – each view definition is a state machine. Machines are
  registered in `src/fsm/registry.ts` and implemented by helpers in
  `src/fsm/state-machine.ts`. Components subscribe using `ux-state`.
* **Reactive primitives** – `reactive`, `effect`, `computed`, `batch`
  (see `src/state/reactive.ts`) power fine‑grained updates.
* **Plugins** – browse `packages/@ux3/*` for official plugins and
  `src/plugins/` for the loader/tests. The build system exposes hooks for
  project‑level plugins (see `docs/plugins-*` for examples).

## Key locations

* Views: `src/ux/view` + HTML templates under the same tree. Attached
  schemas in `schema/*.schema.json` guide structure.
* Styles/tokens: `ux/style/` and `ux/token/` – data‑driven, no hard‑coded
  CSS.
* i18n: nested JSON files in `ux/i18n/` mirror route/view hierarchy. Text is
  never in code.
* Services: side‑effects live in `src/services/` and are invoked from FSM
  YAML via `invoke` entries.
* Core packages: `src/fsm/`, `src/ui/`, `src/build/`, `src/state/`,
  `src/security/` (sanitizer helpers), `examples/` for reference apps.
* Tests: majority under top‑level `tests/` alongside `examples/`; 
some
  legacy `src/**/__tests__` remain. Playwright e2e tests live under
  `src/__tests__/e2e` per `playwright.config.ts`.

## Views & schemas

* Every YAML has an `initial` state and a `states` object. States are either
  a string (template path) or an object with `template`, optional
  `invoke`, `on`, etc.
* Guards are JS expressions evaluated against `ctx` and `event`.
* `invoke` may reference local functions (`{ src: 'foo' }`) or services
  (`{ service: 'user', method: 'login' }`).
* Editing workflow: change YAML/HTML → run compiler or `npm run build` →
  inspect generated types/validators. Run compiler manually via
  `ux3 compile --views ./src/ux/view --output ./src/generated`.
* Validators (in `src/build/validator.ts`) catch missing templates,
  unreachable states, schema violations, i18n gaps, circular dependencies,
  etc. Add custom validators when you extend the schema.

## Common commands

1. `npm run dev` – TS watch + example server.
2. `npm run build` – compile, type‑check, size‑check.
3. `npm run gold` – CI flow (build, tests, size, minify).
4. `npm run test` / `npm run test:watch` – Vitest unit tests.
5. `npm run test:e2e` / `npm run test:e2e:debug` – Playwright.
6. `npm run lint`, `npm run type-check`, `npm run size-check`,
   `npm run a11y-audit`.
7. Example apps: `npm run example`, `npm run dev:iam`.

> Use **npm**; the repo formerly mentioned pnpm but the scripts rely on
> standard npm behaviour.

## Testing notes

* Reset FSM state in tests via `FSMRegistry.clear()`.
* Use helpers from `tests/utils` and `src/testing/` for plugin/service
  stubs.
* Unit tests mirror the `src/` structure; example apps include their own
  integration tests under `examples/*/__tests__`.
* Playwright config points at `src/__tests__/e2e`.

## Patterns & gotchas

* Do **not** edit generated code (`src/generated`).
* Avoid `innerHTML`; use sanitizer helpers when rendering external HTML.
* When adding new features to the view/schema system, remember to update
  the JSON schema and the validator plugin.
* HTMX is deliberately excluded – look for `ux-event`, `ux-if`, etc.
* Styles are referenced by widget name; there is no global CSS.

## Documentation & further reading

* `docs/` contains deep dives (routing, hooks, plugins, FSM core, etc.).
* `ARCHITECTURE.md` and `IMPLEMENTATION.md` give high‑level overviews.
* Example applications (`examples/todo`, `examples/iam`) are runnable
  references.

---

If any of the above is unclear or outdated, ask for clarification so the
instructions can be refined.
