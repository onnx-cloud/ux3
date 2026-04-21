# Events Guide

Use events to connect templates, state machines, and components in a predictable way.

This guide focuses on app-level usage.

---

## Event Model

UX3 apps typically use events in three places:

1. Template events: user actions from HTML templates
2. FSM events: transitions between declared states
3. Component events: reusable ux-* custom elements publishing events

Keep events explicit and named for intent.

Recommended style:

- Template-to-FSM events: uppercase intent names like `OPEN_MODAL`, `SAVE`, `RETRY`
- Component custom events: namespaced names like `ux:open`, `ux:close`, `ux:change`

---

## Template Events

Bind events in template HTML using `ux-event`:

```html
<button ux-event="RETRY">Retry</button>
<button ux-event="SAVE">Save</button>
```

The event name is sent to the active view FSM.

### Good Practices

- Use intent-based names, not DOM implementation names
- Prefer one event per user intent
- Keep names consistent across views where behavior is shared

---

## FSM Events and Transitions

In a view YAML, declare transitions in `on`:

```yaml
initial: idle
states:
  idle:
    template: view/profile/idle.html
    on:
      EDIT: editing
  editing:
    template: view/profile/editing.html
    on:
      CANCEL: idle
      SAVE: saving
  saving:
    template: view/profile/saving.html
    invoke:
      service: profile
      method: update
    on:
      SUCCESS: idle
      ERROR: error
  error:
    template: view/profile/error.html
    on:
      RETRY: saving
```

This keeps behavior declarative and reviewable.

---

## Component Events

Reusable components should emit custom events for external orchestration.

Example event naming:

- `ux:ready`
- `ux:state-change`
- `ux:open`
- `ux:close`
- `ux:error`

Consume component events in parent composition logic by listening to these events and then dispatching FSM events or service actions.

---

## Event Payload Conventions

When including detail payloads, use stable keys:

- `id`
- `type`
- `value`
- `source`
- `timestamp`

For errors, include:

- `code`
- `message`
- optional `meta`

Keep payloads serializable and concise.

---

## Error and Retry Pattern

A reliable event flow for async operations:

1. `SUBMIT` or `LOAD`
2. state enters `loading`
3. invoke service
4. emit/transition `SUCCESS` or `ERROR`
5. show explicit retry action with `RETRY`

This pattern makes behavior testable and consistent across views and components.

---

## Testing Events

For each view/component:

- Verify user action triggers expected event
- Verify FSM transition on event
- Verify payload shape for custom events
- Verify error and retry flows

If an event changes over time, treat it as a contract change and update docs/tests together.
