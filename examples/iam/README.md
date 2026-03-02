# IAM Market Intelligence

(IAM)[https://investamerica.money/]

A complete market intelligence application built with UX3.

 demonstrating:

- Store for state management
- Form validation
- Routing
- Widget composition
- HTMX integration
- Chart composition 
- State-machine views
- HTTP services for chart data
- JSON-RPC services for chat, views, pages

## Main sections

for you, dashboard, chat, search
today, asset, sector, macro, news
blog, pages
account, sign-up, billing

## Running

```bash
cd examples/iam
pnpm install
pnpm dev
```

Open [localhost:1337](http://localhost:1337)

## Notes

- A suite of declarative YAML scenarios and Playwright specs lives under `tests/decl` and `tests/e2e` respectively. These drive the login, news, and market flows and serve as a living specification for the application.
- This example has been updated to be UX3 idiomatic: missing i18n keys and styles were added, and missing views were wired.
- Services are configured in `ux/service/services.yaml` and point at local API paths.  During development the dev server mounts `./public` at `/`, so you can provide dummy data files under `public/api` (e.g. `/api/news/today.json`) instead of hard‑coding logic. This keeps the app realistic and eliminates earlier boilerplate.
- Styles are intentionally simple Tailwind-like classes and should be migrated to tokens (see `ux/token/`) for production parity.
- **Centralised style registry:** the framework now exposes a shared `@ux3/ui/style-registry` module.  the IAM example originally built a map of utilities in `app.deprecated.ts` but now relies on the framework helper; that file merely calls `registerStyles()` and `initStyleRegistry()` instead of patching `ViewComponent` itself.  The registry auto‑loads any `ux-style` keys from templates at runtime and the legacy helper even glob‑loads YAML compositions so you don’t have to keep the map in sync manually.  No view templates contain hard‑coded classes; styling is declarative and applied dynamically.
- Add configuration checks (CI) to fail on missing i18n keys or `ux-style` references.
- The project `ux/ux3.yaml` includes a `development` section enabling hot-reload,
  debug logging and a `window.__ux3Inspector` hook; these settings are
  consumed by the framework during `createAppContext` to aid local debugging.
  When inspector is true a little overlay panel (`<ux3-inspector>`) also
  appears in the app showing running FSM states and services.  Click it to
  hide/show.

