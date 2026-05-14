---
title: "System Model"
paper: "FSM-Driven Reactive UI: A Research Agenda for Intent-aware Interfaces"
chapter: 4
---

This chapter describes the system model for UX3’s FSM-driven runtime.

A UX3 widget is represented as a finite-state machine with an initial state, named states, transitions, guards, and actions. The runtime evaluates events against available transitions and executes effects when guards succeed.

Template-driven state transitions are central. Each state may render a specific template, and the runtime binds event handlers according to the current machine state. This tight coupling between state and presentation reduces mismatch between visual UI and state semantics.

Guards are declarative conditions over context and event data. Side effects are expressed through explicit invocation declarations. This design separates pure state changes from effectful operations, which improves testability and debugging.

Failure and recovery are first-class. Error conditions can map to explicit error states, enabling structured recovery paths and avoiding ad hoc exception handling in the UI layer.
