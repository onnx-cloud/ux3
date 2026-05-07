# UX View Hints

Use `ux3 generate view <name>` to scaffold a new view quickly.

`ux/widget/` defines screen-level finite-state machines (FSMs).

## What belongs here

- One YAML file per widget (`ux/widget/<widget>.yaml`) that defines state transitions.
- One folder per widget (`ux/widget/<widget>/`) containing the HTML template for each state.

## How a view works

- `initial` sets the starting state.
- `states` maps state names to either:
  - A template path string, or
  - An object with `template`, optional `invoke`, and optional `on` transitions.
- `on` transitions are event-driven (`EVENT: targetState`).
- Guards and conditions evaluate against `ctx` and `event`.

## Side effects and integrations

- Use `invoke.src` for local logic handlers (typically implemented in `src/logic/*.logic.ts`).
- Use `invoke.service` + `invoke.method` to call declared services from `ux/service/*.yaml`.
- Keep template files focused on rendering; put behavior in FSM + logic/service layers.

## Authoring conventions

- Keep view names kebab-case (for stable paths and route matching).
- Keep template paths rooted from `widget/...` for consistency.
- Ensure every transition target exists in `states`.
- Prefer explicit intermediate states (`loading`, `submitting`, `error`) over implicit async behavior.

## Reference shape

```yaml
initial: idle
states:
  idle:
    template: widget/login/idle.html
    on:
      SUBMIT: submitting
  submitting:
    template: widget/login/submitting.html
    invoke:
      src: handleLoginSubmit
    on:
      SUCCESS: done
      ERROR: idle
  done: widget/login/done.html
```
