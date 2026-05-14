---
title: "Core Thesis"
paper: "FSM-Driven Reactive UI: A Research Agenda for Intent-aware Interfaces"
chapter: 3
---

This chapter articulates the core thesis: UI behavior should be represented as explicit machine states and transitions, not implicit event chains.

Mapping UI behavior to named states makes interaction logic inspectable. UX3 specifies states, transitions, and guards in declarative source, allowing tools to detect unreachable states and ambiguous transitions.

Context, guards, and event semantics are first-class constructs. Guards are evaluated against documented widget context and event payloads, rather than being hidden in imperative callbacks. This separation makes intent explicit and simplifies reasoning about why transitions fire.

Compositional FSM patterns are important for nested widgets. UX3 allows parent widgets to orchestrate child widget states without collapsing all behavior into a single global state machine. This supports modular design and avoids the complexity of monolithic state graphs.

The chapter also positions FSMs as a cognitive substrate for planning and intent. Explicit machine state can serve as an interface contract, making it easier for developers and tools to reason about interactive behavior.
