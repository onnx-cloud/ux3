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

- This example has been updated to be UX3 idiomatic: missing i18n keys and styles were added, and missing views were wired.
- Service functions in `ux/services/index.mjs` are **example stubs** for local development and testing; replace them with real API integrations for production.
- Styles are intentionally simple Tailwind-like classes and should be migrated to tokens (see `ux/token/`) for production parity.
- **Centralised style registry:** this example demonstrates a registry (in `app.ts`) that maps `ux-style` keys to Tailwind utility lists and injects them at runtime.  The registry even auto‑loads the YAML compositions under `ux/style/compositions` so you don’t need to maintain the map manually.  No view templates contain hard‑coded classes; styling is declarative and applied dynamically.
- Add configuration checks (CI) to fail on missing i18n keys or `ux-style` references.

