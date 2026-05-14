---
title: "Background and Related Work"
paper: "FSM-Driven Reactive UI: A Research Agenda for Intent-aware Interfaces"
chapter: 2
---

This chapter surveys prior work on finite-state machines, reactive frameworks, and actor-style interfaces.

Finite-state machines are widely used in embedded systems and dialog management. In frontend engineering, tools such as XState and statecharts have shown that explicit state modeling improves correctness and debuggability. UX3 extends this idea by compiling machine definitions into typed runtime artifacts.

Reactive programming offers a complementary perspective. It enables UIs to update automatically in response to state changes. UX3 combines reactive state with explicit FSM semantics, which supports both change propagation and clear state boundaries.

Actor-model interfaces, where components communicate through messages, align with UX3’s event-driven machine model. The actor analogy is useful because it emphasizes isolation, explicit message handling, and composability.

The chapter clarifies where UX3 diverges from related systems. It is not just another statechart library; it is a compile-first framework where machine structure is validated and generated before runtime. This makes the research agenda distinct and practically relevant.
