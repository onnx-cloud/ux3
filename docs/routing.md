# Routing — App Guide

Overview
---
Routing in App is driven by `ux/route/routes.yaml` and compiled into `generated/routes.ts`. Routes wire URLs to top-level views and support parameters and route guards.

Where to look
---
- `examples/iam/ux/route/routes.yaml`
- Generated output: `examples/iam/generated/routes.ts`

Guidelines
---
- Define routes declaratively in YAML; use route parameters and optional guards when needed.
- Keep route handlers thin; heavy lifting belongs in views and services.

Testing
---
- Add route-level tests verifying route matching and navigation behavior (history API, query params).

Reference
---
- `src/cli/compile.ts` for compile-time behavior
- `src/build/manifest-generator.ts` for how routes are included in the build