# How-To: Config-First App Development

This section provides terse, actionable instructions for humans to perform common tasks while building a full application (e.g. IAM) starting from configuration files.

## Quick Start
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Run dev server**
   ```bash
   npm run dev
   ```
3. **Compile views**
   ```bash
   npm run build
   ```

## Configuration Workflow
- Edit YAML/JSON under `src/ux/` for views, routes, i18n, tokens, styles, etc.
- Run `npm run build` to validate and generate code (`src/generated`).
- Avoid editing generated files directly.

## Adding a View
1. Create a YAML machine in `src/ux/view/<name>.yaml`.
2. Add corresponding HTML template in same folder.
3. Update schema if needed (see `schema/`).
4. Rebuild and test UI with `npm run dev`.

## Services & Side Effects
- Place service modules in `src/services/`.
- Invoke them from FSMs using `invoke:` entries.
- Write unit tests under `tests/` matching the service path.

## Plugins
- Create project-level plugins under `src/plugins/`.
- See existing `packages/@ux3/*` for examples.
- Lint and test plugins with normal build/test commands.

## Testing
- Unit tests: `npm run test` or target specific paths.
- e2e tests with Playwright: `npm run test:e2e`.
- Reset FSM state in tests using `FSMRegistry.clear()`.

## Examples
- Inspect `examples/iam` for a full production app structure.
- Use `npm run example` to start.

> Keep notes concise and stick to config-centric edits. Refer to docs in the repo for deeper context.