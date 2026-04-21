# FSM Core

Use finite state machines to define how a UX3 view behaves over time.

This is the primary UX3 pattern for predictable UI behavior.

---

## Why FSMs in UX3

FSMs make UI behavior explicit:

- each state has one clear purpose
- transitions are event-driven
- async flows show loading/success/error states clearly
- retry and failure paths are first-class

In UX3, your view YAML is the contract for those behaviors.

---

## Basic FSM Structure

```yaml
initial: idle
states:
  idle:
    template: view/account/idle.html
    on:
      EDIT: editing

  editing:
    template: view/account/editing.html
    on:
      CANCEL: idle
      SAVE: saving

  saving:
    template: view/account/saving.html
    invoke:
      service: account
      method: update
    on:
      SUCCESS: idle
      ERROR: error

  error:
    template: view/account/error.html
    on:
      RETRY: saving
```

This is the recommended baseline for user-editable forms.

---

## States

A state should represent one user-visible mode.

Common state names:

- `idle`
- `loading`
- `ready`
- `editing`
- `saving`
- `error`

Avoid combining multiple user modes into a single state.

---

## Events and Transitions

Events are the only way state changes happen.

Use intent-based names:

- `OPEN`
- `CLOSE`
- `SUBMIT`
- `SUCCESS`
- `ERROR`
- `RETRY`

Template event example:

```html
<button ux-event="SAVE">Save</button>
<button ux-event="CANCEL">Cancel</button>
```

For broader event guidance, see [docs/events.md](events.md).

---

## Guards

Use guards when transition eligibility depends on current context.

```yaml
on:
  SUBMIT:
    target: saving
    guard: (ctx) => ctx.isValid === true
```

Keep guard logic small and focused.

---

## Actions

Actions are for transition-time updates.

Typical uses:

- set flags (`isDirty`, `isSaving`)
- capture payload values
- normalize lightweight data

Keep heavy side effects in services invoked from states.

---

## Async Pattern

Recommended async lifecycle:

1. user event enters `loading` or `saving`
2. state invokes service
3. service response drives `SUCCESS` or `ERROR`
4. retry path remains explicit (`RETRY`)

This pattern keeps UX consistent and testable.

---

## View Integration

A view component binds to an FSM and renders templates per state.

```html
<ux-profile ux-fsm="profile" ux-view="profile"></ux-profile>
```

Your templates should reflect the active state clearly.

---

## Testing FSM Behavior

For each view FSM, test:

- valid transition paths
- blocked transitions (guards)
- error and retry flows
- async success/failure transitions

FSM tests should focus on behavior contract, not implementation details.

---

## Best Practices

1. Keep states minimal and meaningful.
2. Use consistent event names across similar flows.
3. Model failures explicitly with `error` states.
4. Always provide retry path for recoverable operations.
5. Keep business side effects in services, not templates.

---

## Related Guides

- [docs/events.md](events.md)
- [docs/views.md](views.md)
- [docs/services.md](services.md)
- [docs/developer-user-guide.md](developer-user-guide.md)
