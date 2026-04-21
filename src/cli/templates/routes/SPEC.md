# Template: `routes`

Used by: `ux3 generate routes`

## Tokens

| Token | Example |
|---|---|
| `[[ date ]]` | `2026-04-21` |

## Files emitted (relative to `ux/route/`)

```
routes.yaml   — route table
```

## Conventions

- Each route entry must have `path` and `view`.
- `view` must match the slug of a YAML file under `ux/view/`.
- `title` is used for `<title>` and breadcrumbs; use the i18n key if i18n is active.
- `layout` is optional; if omitted the default layout is used.
- Dynamic segments use `:param` syntax (e.g. `/users/:id`).
- Guard expressions in `guard` evaluate against `ctx` (the app context).

## Route entry shape

```yaml
routes:
  - path: /
    view: hello
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

## Example invocation

```bash
ux3 generate routes
```
