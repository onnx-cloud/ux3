# Views and FSMs

UX3 views are finite-state machines (FSMs) declared in YAML.

## Required Shape

- `initial`: starting state
- `states`: state map

A state can be:
- A template string, or
- An object with `template`, optional `invoke`, and `on` transitions

## Transition Model

- Events trigger transitions (`on`).
- Guards evaluate against `ctx` and `event`.
- Actions update context and drive UI behavior.
- Async work should be done via `invoke`.

## FSM Design Rules

- Represent failures as explicit error states.
- Keep retry/cancel paths explicit.
- Keep context minimal and serializable.
- Avoid hidden transitions and side effects in templates.

## Typical Pattern

- `idle` -> user event -> `loading`
- `loading` invokes service
- success -> `ready`
- failure -> `error`
- `error` supports retry/dismiss
