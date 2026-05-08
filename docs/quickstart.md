# Quickstart

## Prerequisites

- Node.js and npm
- Dependencies installed with `npm install`

## Daily Loop

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run test
```

## Minimal Feature Flow

1. Add or update a widget FSM in `src/ux/widget/**.yaml`.
2. Add matching HTML template next to the YAML.
3. Add i18n keys in `ux/i18n/**`.
4. Add or update styles/tokens under `ux/style/**` and `ux/token/**`.
5. Run build and tests.

## Project Shape (Mental Model)

- Declarative input: `ux/widget`, `ux/style`, `ux/token`, `ux/i18n`, `ux/routes`.
- Compiler/validator: `src/build/**`.
- Runtime: `src/fsm/**`, `src/state/**`, `src/services/**`.
- Output: generated artifacts in `src/generated/**`.
