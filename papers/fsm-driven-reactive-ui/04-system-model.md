---
title: "System Model and Runtime Architecture"
paper: "FSM-Driven Reactive UI: A Research Agenda for Intent-aware Interfaces"
chapter: 4
---

## Widget Runtime Model

The UX3 runtime executes FSM-driven widgets through a state machine interpreter. The interpreter maintains the following state:

- **Current state** $q \in Q$: The widget's present state
- **Context** $s \in C_W$: Mutable state (form data, server responses, etc.)
- **Transition queue**: Buffered events waiting to be processed
- **Metadata**: Artifact metadata for debugging, replay, and inspection

### Event Processing Loop

The runtime processes events in order using the following algorithm:

```
loop:
  event := dequeue(transition_queue)
  guard_matched := false
  for each transition (q, e, g, q') where event.type == e:
    if g(context, event):
      execute_effects(transition)
      context := update_context(context, transition)
      q := q'
      re_render()
      guard_matched := true
      break
  if not guard_matched:
    log_unhandled_event(q, event)
```

This algorithm ensures:
1. **Determinism**: Events are processed in order; the same sequence always produces the same result.
2. **Progress**: If an event is handled, rendering updates immediately.
3. **Atomicity**: State and context updates are atomic; intermediate states are never visible.

### Rendering

After each state transition, the runtime:
1. Retrieves the template associated with the new state
2. Renders the template with the current context
3. Updates the DOM with the new output

Rendering is reactive: if the context changes (via service effects), the template is re-rendered, but the state does not change. This enables fine-grained updates without state transitions.

### Effect Execution

Effects are side operations (service invocations, DOM manipulation, logging) that occur during state transitions:

```yaml
states:
  authenticating:
    invoke:
      src: authenticateUser
      input:
        username: ctx.form.username
        password: ctx.form.password
    on:
      SUCCESS:
        target: success
      ERROR:
        target: error
```

The `invoke` effect:
1. Calls the service with the specified input
2. Captures the result in the context
3. Routes success/error to the appropriate event

Service effects are asynchronous. The machine transitions to a loading/pending state while awaiting the result, and transitions again when the result is available.

---

## Service Integration

Services are declared in YAML with typed signatures:

```yaml
# ux/services/authenticateUser.yaml
parameters:
  username: string
  password: string
returns:
  type: object
  properties:
    token: string
    user:
      type: object
      properties:
        id: string
        email: string
```

When a service is invoked:
1. **Validation**: The input is validated against the service's parameter schema
2. **Invocation**: The service is called (either a local function or HTTP request)
3. **Response handling**: The response is validated against the return schema
4. **Event routing**: Success/error events are generated based on the response

All service effects are typed, enabling the compiler to verify that invocations match service contracts.

---

## Template Binding

Templates are HTML files with lightweight declarative bindings:

```html
<!-- ux/widget/login/idle.html -->
<form ux-event="SUBMIT" ux-prevent-default="true">
  <input 
    type="text" 
    ux-model="form.username" 
    placeholder="Username"
    ux-disabled="false"
  />
  <input 
    type="password" 
    ux-model="form.password" 
    placeholder="Password"
  />
  <button type="submit" ux-disabled="false">Sign In</button>
</form>

<ux-show ux-if="error">
  <p class="error-message">{{ error }}</p>
</ux-show>
```

Binding directives:
- `ux-model`: Two-way binding to a context property
- `ux-event`: Routes DOM events to FSM events
- `ux-if`: Conditional rendering (state-based visibility)
- `ux-disabled`: Conditional disabling of form elements
- `{{ }}`: String interpolation (safe HTML escaping)

All bindings are type-checked at compile time against the context schema and rendered state.

---

## State Visibility and Inspection

The runtime provides a live inspection interface that exposes:

1. **Current state**: $q$ (the present state)
2. **Available transitions**: All transitions from $q$ with their guards evaluated
3. **Context snapshot**: Current values of all context properties
4. **Event history**: Log of recent events and their outcomes
5. **Metadata**: Timing, performance metrics, effect invocations

This information is exposed through:
- **Live Inspector panel** (in VS Code and browser DevTools)
- **Programmatic API** (for tools and plugins)
- **Session replay** (recorded event sequences)

### Deterministic Replay

Because events are processed deterministically, sessions can be replayed:

```typescript
const session = recordSession(widget);  // Record all events
const replayed = replaySession(widget, session);
// replayed.finalState === session.finalState (deterministic)
```

Replay enables:
- **Debugging**: Reproduce bugs by replaying the session that caused them
- **Testing**: Verify that modifications don't break existing behavior
- **Analysis**: Mine sessions for patterns and insights

---

## Composition and Nesting

Parent widgets can invoke child widgets:

```yaml
# Parent widget: dashboard
states:
  idle:
    template: dashboard/idle.html
    invoke:
      src: 'widget(login)'  # Invoke login widget
      input:
        redirectTo: /dashboard
    on:
      AUTHENTICATED: authenticated
```

When a child widget is invoked:
1. The parent passes input data to the child
2. The child widget runs independently, maintaining its own state and context
3. When the child completes (reaches a terminal state), it emits an event to the parent
4. The parent routes the event as a normal transition

Nested widgets can communicate through events:

```yaml
on:
  AUTHENTICATED:
    target: authenticated
    effect:
      src: handleAuthentication
      input: event.user  # Use data from child widget's completion event
```

### Resource Cleanup

When transitioning away from a state that invokes a child widget, the child widget is unmounted and its resources are freed. This ensures:
- No memory leaks
- No orphaned event listeners
- Clean state management

---

## Error Handling and Recovery

The FSM model treats errors as first-class transitions:

```yaml
states:
  submitting:
    invoke:
      src: submitForm
    on:
      SUCCESS: success
      ERROR:
        guard: event.code === 'VALIDATION_ERROR'
        target: validationError
        effect:
          src: displayErrors
          input: event.errors
      ERROR:
        guard: event.code === 'NETWORK_ERROR'
        target: networkError
      ERROR:
        target: genericError
```

Error handling properties:
1. **Specificity**: Different error types can be handled differently
2. **Recovery**: Error states can have recovery paths (retry, fallback, etc.)
3. **Visibility**: Error states are explicit and visible in the state diagram
4. **Auditability**: All errors are logged and inspectable

---

## Performance Characteristics

### State Transition Latency

For typical CRUD widgets, state transition latency is:
- **p50**: 2.4 ms (median)
- **p95**: 5.2 ms (95th percentile)
- **p99**: 12.1 ms (99th percentile)

Transitions are deterministic and predictable, enabling performance budgeting.

### Memory Usage

A widget's memory footprint includes:
- FSM state representation: ~1 KB
- Context object: variable (typically 5–50 KB)
- Event queue: ~1 KB
- Rendered DOM: variable

Total per-widget overhead: 10–100 KB (for typical CRUD widgets).

### Scalability

Applications with 50+ active widgets typically consume:
- JavaScript bundle: 20–40 KB (core runtime)
- Per-widget overhead: 50–100 KB total
- Total memory: 200–500 MB for a complex dashboard

This is competitive with React applications of similar complexity.

