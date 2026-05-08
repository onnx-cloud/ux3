# Runtime Architecture

## Compile-First Pipeline

1. Read declarative definitions (views, routes, styles, i18n, tokens).
2. Validate schema and cross-file consistency.
3. Generate typed artifacts in `src/generated/**`.
4. Run runtime with FSM registry + reactive state.

## Runtime Building Blocks

- FSM engine: `src/fsm/**`
- Reactive primitives: `src/state/reactive.ts` (`reactive`, `effect`, `computed`, `batch`)
- Services layer: `src/services/**`
- Security helpers: `src/security/**`

## Core Rule

Framework behavior should come from declarative config + explicit transitions. Keep imperative runtime patches to a minimum and isolate them in tested modules.
