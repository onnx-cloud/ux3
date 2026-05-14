---
title: "Introduction"
paper: "FSM-Driven Reactive UI: A Research Agenda for Intent-aware Interfaces"
chapter: 1
---

## The Problem: Implicit State in Modern UIs

Modern single-page applications manage complex state: user input, server responses, UI visibility, form validation, loading states, error conditions, and temporal state (animations, transitions). In imperative frameworks, this state is distributed across:

- React component state hooks
- Redux stores or similar global state
- Local variables in event handlers
- Implicit state in the DOM (checked status, focus, scroll position)
- Temporal state in setTimeout/animation callbacks

This distribution makes state implicit: it is not documented in one place, and the set of valid states is not enumerated. Consequently:

1. **Implicit state transitions**: A component can receive events that are invalid for its current state. For example, clicking "submit" while already submitting may cause race conditions or duplicate submissions.
2. **Unreachable states**: Developers may implement states that are never reached due to conditional branches, leading to dead code and confusion.
3. **Inconsistent UI feedback**: State and visual representation can diverge; a form might display validation errors in one place but not another.
4. **Difficult debugging**: When something goes wrong, there is no authoritative record of state transitions. Developers must manually trace through event handlers and re-executions.
5. **Resistance to reasoning**: It is difficult for tools or agents to reason about UI behavior when state is implicit.

These problems are well-documented in practice (e.g., studies of React applications show that 25–30% of bugs involve state-related issues; cf. Gallaba et al. 2018, Alshammari et al. 2019).

## Finite-State Machines as a Solution

Finite-state machines provide a mathematically rigorous model for systems with discrete states and event-driven transitions. In the context of UI, the FSM model offers:

1. **Explicitness**: All valid states are enumerated. Invalid states are by definition impossible.
2. **Reachability**: We can compute which states are reachable from the initial state and detect unreachable (dead) code.
3. **Completeness**: We can verify that all possible events are handled in each state (or intentionally ignored).
4. **Auditability**: State transitions are explicit and form an audit trail.
5. **Composability**: Nested FSMs can be reasoned about independently.

The FSM model is not new (cf. Mealy 1955, Moore 1956), but its application to UI has been underexploited in practice. Traditional UI frameworks focus on rendering logic and data binding; they treat state management as a secondary concern. We invert this priority: state is the primary abstraction, and rendering is derived from state.

## Positioned Against Related Work

**Reactive frameworks** (React, Vue, Angular) focus on declarative rendering ("when data changes, re-render") but do not enforce structured state machines. State is implicit and unverified.

**Statechart libraries** (XState, StateCharts.js, McState) provide excellent FSM modeling within imperative code, but they do not enforce compile-time verification or generate type-safe artifact graphs.

**Elm language** commits fully to FSM-driven architecture and provides strong guarantees, but it requires developers to adopt functional programming and a new language.

**Actor model systems** (Akka, Orleans) provide FSM-based concurrency control but are oriented toward backend systems, not UI.

This paper's contribution is the integration of FSM semantics into a compile-first frontend architecture, where:
- FSMs are declarative (YAML), not imperative (JavaScript)
- State machines are type-safe by construction
- The entire state space can be analyzed and verified at compile time
- Runtime behavior is observable, replayable, and inspectable
- The FSM structure is a natural interface for agents and automated planning

## Roadmap

The remainder of this paper is organized as follows:

- **Chapter 2** surveys related work on FSMs, reactive programming, and actor-model interfaces, situating our contribution within the broader landscape.
- **Chapter 3** articulates the core thesis: explicit FSMs enable observability, auditability, and reasoning about UI behavior.
- **Chapter 4** formalizes the FSM system model, defining semantics for states, transitions, guards, events, and effects.
- **Chapter 5** discusses developer ergonomics: how FSM-driven UI changes the developer experience, tool usage, and debugging practices.
- **Chapter 6** identifies open research problems: formal verification of UI properties, compositional reasoning, and synthesis from specifications.
- **Chapter 7** presents empirical evaluation: benchmarks on state space size, debugging time, and agent reasoning accuracy.
- **Chapter 8** concludes with future directions and implications for interactive systems research.

