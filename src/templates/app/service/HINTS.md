# UX Service Hints

`ux/service/` defines service contracts used by FSM invokes.

## What belongs here

- Declarative service contract files in `ux/service/*.yaml`.
- Optional runtime implementations under `src/services/*.ts`.

## Contract semantics

- `name` is the service identity and should match the file slug.
- `endpoint` defines the base target (can reference environment values).
- `methods` declares the operations available to views and logic.
- Method names should be stable because FSM invokes depend on them.

## Runtime behavior

- FSMs call services with `invoke.service` + `invoke.method`.
- Implementations should stay transport-focused (HTTP/data translation), not UI-focused.
- Throw explicit errors so FSM transitions can route to recovery states.

## Authoring conventions

- Keep service names and method names kebab or lower camel style consistently.
- Keep contracts small and cohesive by domain (`auth`, `user`, `catalog`).
- Keep request/response shaping in one place per method.

## Reference shape

```yaml
name: user
description: User service
endpoint: /api/user
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
```
