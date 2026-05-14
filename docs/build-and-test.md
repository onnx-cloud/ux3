# Build and Test

## Build Commands

```bash
npm run dev
npm run build
npm run lint
npm run type-check
npm run size-check
```

## Test Commands

```bash
npm run test
npm run test:watch
npm run test:e2e
npm run test:e2e:debug
npm run a11y-audit
npm run researcher
```

## Research Assistant

Run `npm run researcher` to collect build, validation, and test artifacts into a root report and paper-specific findings files under `papers/*/findings/verified-findings.json`.

Paper-specific experiment configuration is now stored in `papers/*/experiments.yaml`, and the researcher command reads each paper manifest to execute the correct evidence pipeline.

Use `npm run researcher -- --skip-commands` to generate findings from existing artifact files without re-running the full build/test pipeline.

## What Build Validates

- Schema conformance for declarative files
- FSM reachability and transition sanity
- i18n key presence
- Template consistency with view definitions

## Test Guidance

- Unit/integration tests live in `tests/**`.
- Reset FSM registry in tests with `FSMRegistry.clear()` when needed.
- Prefer small deterministic tests for FSM transitions and services.
- Use Playwright only for end-to-end behavior.

## Deployment Notes

UX3 apps compile to static assets. Deploy `dist/` to any static host and rewrite unknown routes to `index.html` for SPA navigation.
