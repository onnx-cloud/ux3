# Routing

Routing maps URLs to views declared in UX config.

## Principles

- Keep route definitions declarative.
- Route handlers should select views and provide context, not execute heavy business logic.
- For SPA hosting, rewrite unmatched paths to `index.html`.

## Good Practices

- Use stable, predictable route naming.
- Keep auth/permission checks explicit in FSM/service flow.
- Keep route-level data fetching in service-invoked states.
