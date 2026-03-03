# Kanban Pro Example

This repository contains a fully‑featured kanban board application built entirely with the
UX3 framework. It is shipped as an _example_ but also serves as a starting point for a
production‑ready project – every interaction, form and data schema is defined declaratively
in YAML/JSON with zero imperative UI code.

The app supports:

- **Projects** (top‑level containers)
- **Boards** within projects
- **Swim lanes** with WIP limits and drag‑and‑drop reordering
- **Tasks** with priority, assignee, due date, points, labels and comments
- Offline persistence via `@ux3/plugin-store` (IndexedDB)
- Optional remote sync for multi‑device collaboration
- Full internationalization (i18n) with type‑safe keys
- Validation, error messages and business logic in shared modules
- Unit and e2e tests demonstrating common flows

## Getting started

```bash
cd examples/kanban
npm install           # install workspace dependencies
npm run dev:kanban    # start dev server on http://localhost:1337
npm run build         # produce production bundle in dist/
```

## Local use & data

Data lives in IndexedDB under the `kanban-db` database; inspect or clear it via
browser devtools. The store is configured to a hybrid backend – by default only the
`local` adapter is active, but you can point `store_hybrid.remote.baseUrl` at a
your own service to enable online sync.

## Customizing

- Edit `ux/schema/models.yaml` to extend the data model.
- Update `ux/view/*` YAML files to change UI flow; templates live in the
  corresponding `ux/view/**/*.html` files.
- Add translation strings under `ux/i18n/<lang>/*.json` and run `npm run build` –
  the compiler will regenerate the `I18nKey` union automatically.
- Styles are defined in `ux/style/compositions/kanban.css` and tokens under
  `ux/token/*.yaml`.

## Validation & errors

All validation logic lives in `src/logic/views/validators.ts`. Errors thrown from
that module are localized with i18n keys, e.g. `i18n('validation.laneNameRequired')`.
The FSMs catch and display these messages via `ctx.error`.

## Testing

Unit tests for the example live in `tests/examples-kanban`; e2e tests can be
run with:

```bash
npm run test:e2e --project=examples/kanban
```

The sample suite currently covers project loading, task creation and drag‑and‑drop.

## Roadmap

The codebase is intentionally barebones – extendable toward a real product by
adding authentication, webhooks, reporting, external integrations (Slack/GitHub, etc.),
and so on. Consider the existing i18n, validation and service patterns best practices
for UX3 apps.
