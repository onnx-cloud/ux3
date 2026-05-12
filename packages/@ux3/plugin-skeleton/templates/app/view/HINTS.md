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

## Example

```yaml
name: my-view
layout: default
initial: index
context:
  loading: false
  error: null
states:
  index:
    template: widget/my-view/index.html
    on:
      SUBMIT:
        actions: [handleSubmit]
      '*': {}
```

For async workflows:

```yaml
name: async-view
layout: default
initial: index
context:
  loading: false
  error: null
states:
  index:
    template: widget/async-view/index.html
    on:
      LOAD:
        target: loading
        actions: [startLoad]
  loading:
    invoke:
      src: fetchData
      onDone: index
    errorTarget: index
    on:
      '*': {}
```
