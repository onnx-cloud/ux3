# UX Routing Hints

`ux/route/routes.yaml` defines URL-to-view mapping and navigation policy.

## What belongs here

- The route table (`routes:`) for all navigable screens.
- Optional route metadata such as `title`, `layout`, and `guard`.

## Core rules

- Every route needs `path` and `view`.
- `view` should match a view slug under `ux/view/`.
- Prefer stable, human-readable paths and avoid embedding business logic in route names.
- Dynamic segments use `:param` (for example, `/users/:id`).

## Navigation and access control

- Use `guard` for access checks and gating logic.
- Keep guards deterministic and based on app context (`ctx`).
- Put auth/permission semantics in services or plugins; use route guards for orchestration.

## Layout and metadata

- `layout` selects an alternative page shell when needed.
- `title` should be present for UX consistency and better history/bookmark readability.
- If i18n is enabled, prefer using keys that map to locale strings.

## Reference shape

```yaml
routes:
  - path: /
    view: home
    title: Home
  - path: /about
    view: about
    title: About
  - path: /users/:id
    view: user-detail
    title: User
    layout: main
    guard: ctx.user.isAuthenticated
```
