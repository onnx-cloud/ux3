# UX View Hints

`ux/view/` defines screen-level finite-state machines (FSMs).

## What belongs here

- One YAML file per view (`ux/view/<view>.yaml`) that defines state transitions.
- One folder per view (`ux/view/<view>/`) containing the HTML template for each state.

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
- Keep template paths rooted from `view/...` for consistency.
- Ensure every transition target exists in `states`.
- Prefer explicit intermediate states (`loading`, `submitting`, `error`) over implicit async behavior.

## Reference shape

```yaml
initial: idle
states:
  idle:
    template: view/login/idle.html
    on:
      SUBMIT: submitting
  submitting:
    template: view/login/submitting.html
    invoke:
      src: handleLoginSubmit
    on:
      SUCCESS: done
      ERROR: idle
  done: view/login/done.html
```
