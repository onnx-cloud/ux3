# Copilot Instructions — UX3 Framework

UX3 is a compile‑first SPA framework: views, styles, validation, and i18n are declared in YAML/HTML/JSON and compiled into typed runtime artifacts.

## Big picture
- **FSM‑driven UI**: every view is a finite‑state machine (FSM). Config lives in `src/ux/view/**/*.yaml`, templates in adjacent HTML. Runtime FSMs are registered via `src/fsm/registry.ts` and implemented in `src/fsm/state-machine.ts`.
- **Compile pipeline**: `src/build/` validates schema, reachability, i18n keys, and templates, then emits generated types to `src/generated/` (never edit by hand).
- **Reactive core**: `reactive`, `effect`, `computed`, `batch` in `src/state/reactive.ts` power fine‑grained updates.
- **Services & side‑effects**: declared in YAML, invoked from view FSMs using `invoke` entries like `{ src: 'localFn' }` or `{ service: 'user', method: 'login' }` (see `src/services/`).

## Key conventions
- Views require `initial` and `states`. A state can be a template string or `{ template, invoke, on }`. Guards evaluate against `ctx` and `event`.
- i18n strings live under `ux/i18n/**` (no strings in code). Styles live in `ux/style/**` and are referenced by widget name via `ux-style` (no global CSS).
- Avoid `innerHTML`; use sanitizers from `src/security/` when rendering external HTML.
- Example apps in `examples/` show idiomatic usage; IAM has custom dev notes in [examples/iam/README.md](examples/iam/README.md).
- All temporary scripts, work files, adhoc tests MUST be in `./tmp/` (not `/tmp/`).
- All plans, reviews, progress / summary reports MUST be in `./todo/` (not `/`).
- All code should be DRY, SOLID, follow best practices, with zero anti-patterns. If you see something that could be improved, suggest a refactor or fix. 

## Workflows (npm only)
- `npm run dev` – TS watch + example server
- `npm run dev:iam` – IAM example
- `npm run build` – compile + type‑check + size‑check
- `npm run test` / `npm run test:watch` – Vitest
- `npm run test:e2e` / `npm run test:e2e:debug` – Playwright
- `npm run lint`, `npm run type-check`, `npm run size-check`, `npm run a11y-audit`

## Testing notes
- Reset FSM state with `FSMRegistry.clear()`.
- Use helpers in `tests/utils` and `src/testing/` for stubs.
- Most tests live under `tests/`; Playwright e2e is configured by `playwright.config.ts`.

## Docs & references
- Architecture and CLI details: [docs/README.md](docs/README.md), [docs/compilation.md](docs/compilation.md)
- Plugins: `packages/@ux3/*` and `src/plugins/`

If anything here seems unclear or outdated, ask for clarification so we can refine these instructions.
