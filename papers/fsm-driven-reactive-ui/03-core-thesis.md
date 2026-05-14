---
title: "Core Thesis and Formal Model"
paper: "FSM-Driven Reactive UI: A Research Agenda for Intent-aware Interfaces"
chapter: 3
---

## Core Thesis

We argue that the primary locus of UI complexity is not rendering—rendering is a solved problem in reactive frameworks—but state management. Specifically:

1. **State should be explicit**: The set of valid states must be enumerable and declared upfront.
2. **Transitions should be structured**: State transitions should follow a graph with explicit edges (transitions), conditions (guards), and actions (effects).
3. **State should be observable**: At any point in time, there should be exactly one current state, and state transitions should be logged and inspectable.
4. **State should be verifiable**: The compiler should verify that all states are reachable, all transitions are valid, and guards are consistent with event schemas.

These principles invert the traditional UI programming model. In React or Vue, state is implicit: it lives in component instances and object properties. Rendering is explicit: developers write JSX or templates that define how state maps to DOM. We flip this: state is explicit (declared as an FSM), and rendering is implicit (derived from state).

---

## Formal Model

### Definition: FSM-Driven Widget

A widget is formally defined as a tuple $W = (Q, q_0, \Sigma, \Gamma, \delta, \lambda, s_0)$ where:

- $Q$ is a finite set of states
- $q_0 \in Q$ is the initial state
- $\Sigma$ is the input alphabet (set of event types)
- $\Gamma$ is the output alphabet (rendering/side-effect domain)
- $\delta$ is the transition function: $\delta : Q \times \Sigma \to Q$ (or with guards: $\delta : Q \times \Sigma \times \text{Guard} \to Q$)
- $\lambda$ is the output function: $\lambda : Q \to \Gamma$ (mapping state to rendered output)
- $s_0$ is the initial context (shared mutable state)

### Transition Semantics

A transition is enabled when:
1. The machine is in state $q$
2. An event $e \in \Sigma$ is received
3. The guard $g(s_0, e)$ evaluates to true

When a transition is enabled, the machine:
1. Executes any side effects specified in the transition
2. Transitions to the target state $q'$
3. Updates the context $s_0$

Formally, the machine transitions from $(q, s)$ to $(q', s')$ on event $e$ if:
$$\exists g : (g(s, e) = \text{true}) \land ((q, e, g, q') \in \text{transitions}) \land (s' = \text{effect}(s, e, q'))$$

### Reachability Analysis

We compute the set of reachable states $R$ using a breadth-first search from the initial state:

$$R = \{q \in Q : \exists e_1, e_2, \ldots, e_k \in \Sigma^* \text{ such that } (q_0, e_1) \rightarrow (q_1, e_2) \rightarrow \cdots \rightarrow (q, e_k)\}$$

A state $q \in Q$ is dead code if $q \notin R$. The compiler reports all dead states as warnings.

### Type System

Each widget has an associated type schema $T_W = (I_W, O_W, C_W, E_W)$ where:

- $I_W$ is the input type (parameters to the widget)
- $O_W$ is the output type (what the widget renders)
- $C_W$ is the context type (mutable state schema)
- $E_W$ is the event type (discriminated union of all event types)

The transition function $\delta$ must be typed such that for all guards $g$ in transitions, $g : C_W \times E_W \to \text{Bool}$.

### Temporal Properties

The FSM-driven model enables verification of temporal properties:

1. **Progress property**: From any state except terminal states, there exists at least one enabled transition. (Prevents deadlock.)
2. **Liveness property**: For any event $e$, there exists a state from which $e$ is handled. (Prevents unhandled events in all paths.)
3. **Safety property**: No undefined state transitions occur. (Enforced by reachability analysis and type checking.)

---

## Context and Guards

### Context as Shared Mutable State

Context $s_0$ is a mutable object that persists across state transitions. It stores:
- User input data (form fields, search terms, etc.)
- Server responses (API data, error messages)
- Computed properties (derived data, summaries)

Context is updated by service effects and can be referenced in guards:

```yaml
context:
  form:
    username: ''
    password: ''
  user: null
  error: null

guards:
  hasCredentials: ctx.form.username && ctx.form.password
  isAuthenticated: ctx.user !== null
```

### Guard Evaluation

Guards are pure functions over context and event data. A guard is a predicate $g : C_W \times E_W \to \text{Bool}$. Guard expressions are evaluated in lexical order and short-circuited (if the first guard matches, subsequent guards are not evaluated).

Type safety for guards is enforced by the compiler:
- All context properties referenced in guards must exist in the context schema
- All event properties must exist in the event schema
- Type coercions are checked for validity

---

## Compositional State Machines

Widgets can be composed hierarchically. A parent widget can orchestrate child widgets by:
1. Passing data to child widgets
2. Receiving events from child widgets
3. Managing the child widget's FSM state

Formally, a parent widget can invoke a child widget through an `invoke` effect:

$$\text{invoke}(W_{\text{child}}, I_{\text{child}}) \rightarrow (O_{\text{child}}, E_{\text{child}})$$

The child widget's output and events are routed to the parent, enabling hierarchical composition.

### Composition Safety

Compositional safety requires:
1. **Type compatibility**: The parent's output type must match the child's input type
2. **Event routing**: Events from the child must be handled by the parent
3. **Resource management**: The parent must clean up child widget resources when transitioning away

These properties are verified at compile time.

---

## Error States and Recovery

Errors are first-class in the FSM model. Rather than throwing exceptions, errors transition to explicit error states:

```yaml
states:
  submitting:
    invoke:
      src: submitForm
    on:
      SUCCESS: success
      ERROR:
        guard: event.code === 'NETWORK_ERROR'
        target: networkError
      ERROR:
        target: genericError
  networkError:
    template: errors/network.html
    on:
      RETRY: submitting
```

This design:
1. Makes error conditions explicit and visible in the state diagram
2. Enables structured recovery (retry, fallback, etc.)
3. Prevents exceptions from propagating unhandled

### Terminal States

Some states are terminal (no outgoing transitions). Typical terminal states:
- `success`: Widget has completed its task
- `cancelled`: User cancelled the action
- `fatal`: Unrecoverable error occurred

Terminal states are marked explicitly in the source, and the compiler verifies that no transitions attempt to leave a terminal state.

