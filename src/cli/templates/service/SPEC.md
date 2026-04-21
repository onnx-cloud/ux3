# Template: `service`

Used by: `ux3 generate service <name>`

## Tokens

| Token | Example |
|---|---|
| `[[ name ]]` | `user` |
| `[[ Name ]]` | `User` |
| `[[ name_snake ]]` | `user` |
| `[[ NAME ]]` | `USER` |
| `[[ date ]]` | `2026-04-21` |

## Files emitted

```
ux/service/[[ name ]].yaml       — service declaration
src/services/[[ name ]].ts       — TypeScript implementation stub
```

## Conventions

- The YAML `name` field must match the file slug exactly.
- `methods` lists the operations the service exposes.
- `endpoint` is the base URL (may reference env vars via `${ENV_VAR}`).
- The TS implementation must export an object matching the service name.
- Use `fetch` or an injected HTTP client — do NOT import framework internals.
- Error handling: throw a typed error; the FSM maps it to an ERROR transition.

## YAML shape

```yaml
name: [[ name ]]
description: [[ Name ]] service
endpoint: /api/[[ name ]]
methods:
  - name: get
    http: GET
    path: /{id}
  - name: list
    http: GET
    path: /
  - name: create
    http: POST
    path: /
  - name: update
    http: PUT
    path: /{id}
  - name: remove
    http: DELETE
    path: /{id}
```

## Example invocation

```bash
ux3 generate service user
ux3 generate service product-catalog
```
