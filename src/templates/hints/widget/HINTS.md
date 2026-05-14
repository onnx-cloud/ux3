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
- String guards may resolve nested context paths (for example `user.isAuthenticated`) or cross-FSM state checks (`otherFsm:ready`).
- Use named guard helpers imported from logic modules wherever possible.

## Side effects and integrations

- Use `invoke.src` for local logic handlers (typically implemented in `src/logic/*.logic.ts`).
- Use `invoke.service` + `invoke.method` to call declared services from `ux/service/*.yaml`.
- Keep template files focused on rendering; put behavior in FSM + logic/service layers.

## Authoring conventions

- Use lowercase slug for `name` (e.g., `user-profile`, `form-builder`).
- Use `index` as the primary display state for most views.
- Use `loading` state when invoking async handlers; use `invoke.onDone` and `errorTarget`.
- Use `context:` to pre-declare state schema and initial values.
- Use namespaced events for component interactions (e.g., `'KANBAN:MOVE'`, `'TABLE:SELECT'`).
- Keep transitions in the same state when modifying context with `actions`.
- Use catch-all `'*': {}` to ignore unhandled events gracefully.
- Use `actions: [handler]` to call logic handlers and modify context.

## Reference shape

```yaml
name: login
layout: default
initial: index
context:
  error: null
states:
  index:
    template: widget/login/index.html
    on:
      SUBMIT:
        actions: [handleSubmit]
      '*': {}
```

## Multi-state example

For async operations, use `invoke` with `onDone` and `errorTarget`:

```yaml
name: async-form
layout: default
initial: index
context:
  loading: false
  error: null
states:
  index:
    template: widget/form/index.html
    on:
      SUBMIT:
        target: loading
        actions: [captureFormData]
  loading:
    invoke:
      src: submitForm
      onDone: success
    errorTarget: error
    on:
      '*': {}
  success:
    template: widget/form/success.html
    on:
      RESET: index
  error:
    template: widget/form/error.html
    on:
      RETRY: index
```
