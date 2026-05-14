---
title: "Related Work and Background"
paper: "FSM-Driven Reactive UI: A Research Agenda for Intent-aware Interfaces"
chapter: 2
---

## Finite-State Machines and State Machines

The mathematical foundations of finite automata date to Turing (1936) and have been extensively studied in computer science. Mealy (1955) and Moore (1956) formalized finite-state machines with output, establishing the distinction between Mealy machines (output determined by state and input) and Moore machines (output determined by state alone). Both models are expressively equivalent and form the basis for finite automata theory.

In systems engineering, statecharts (Harel 1987) extended FSMs with hierarchical structure, orthogonal regions, and broadcast communication. Statecharts have been successfully applied to protocol specification (SDL, ITU-T Z.100) and embedded systems (MATLAB/Stateflow). The UX3 model adopts statechart concepts (hierarchical states, nested transitions) while simplifying the formalism for UI-specific constraints.

**FSMs in programming languages**: Some languages have first-class FSM support. Erlang (Armstrong 1997) provides pattern matching and supervisor hierarchies that naturally express FSM-like patterns. ML-family languages support algebraic data types that encode state as discriminated unions, enabling compile-time pattern matching over states. Recent work (Morris et al. 2014) explored dependent types for state machine modeling in Haskell.

## Reactive Programming and Reactive Frameworks

Reactive programming (Kahn & MacQueen 1977, Baxter et al. 2006) emphasizes dataflow and automatic propagation of changes. In the UI context, reactive frameworks (React, Vue, Angular) implement a declarative rendering model: the UI is a function of state, and state changes automatically trigger re-rendering.

**React** (Facebook 2013) introduced virtual diffing and component-based composition, enabling predictable rendering. However, React treats state management as a separate concern, leaving it to developer discipline or third-party libraries (Redux, Zustand).

**Elm** (Czaplicki 2012) combines FSM-based state with reactive rendering, implementing a complete functional reactive programming model for UI. Elm requires the entire application to be written in a functional language, which limits adoption but provides end-to-end type safety and compile-time verification.

**RxJS and reactive extensions** (Meijer 2010) provide observable-based reactive programming. They enable powerful data transformation pipelines but do not enforce state structure or provide compile-time verification.

## State Management Libraries

**Redux** (Dan Abramov 2015) implements unidirectional data flow: actions are dispatched, reducers transform state, and views re-render. Redux enforces a discipline but does not prevent invalid state transitions; enforcement is at the library level.

**XState** (David Khourshid, 2015–present) provides a JavaScript-native FSM library with full statechart support. XState enables expressive FSM modeling but does not provide compile-time verification. Type checking is partial and runtime-dependent.

**MobX** (Michel Weststrate 2015) provides reactive state through object proxies, enabling fine-grained reactivity. MobX does not enforce state structure.

**Zustand** (Jotaro 2020) provides minimal, hooks-based state management. Like Redux, it does not enforce FSM structure.

## Formal Verification and Program Analysis

**Model checking** (Clarke et al. 1986, Holzmann 1997) is a formal technique for verifying that finite-state systems satisfy temporal logic properties. Tools like SPIN and TLA+ enable model checking of concurrent systems. While powerful, model checking is computationally expensive and typically applied to smaller systems.

**Type-based verification** (Norell 2007 on dependent types, McBride 2004 on types and dependent pattern matching) enables compile-time verification through the type system. Dependent types can express invariants like "this list is sorted" or "this network is in state S." However, dependent typing requires significant learning overhead and has limited adoption in mainstream languages.

**Liquid Haskell** (Vazou et al. 2014) combines Haskell's type system with SMT-based refinement types, enabling verification of invariants like array bounds and data ordering without full dependent typing.

## Debugging and Observability

**Time-travel debugging** (Bates 1984, Debuggers like OzDebug, Pernosco) records program execution and enables stepping backward through execution. Time-travel debugging is powerful for understanding bugs but is computationally expensive and rarely used in practice.

**Session replay** (tools like Logrocket, Rrweb) records user interactions and DOM changes, enabling reproduction of user-reported bugs. Session replay is widely used but does not capture state semantics.

**Live programming environments** (Tanimoto 2013, Burckhardt et al. 2015 on Sketch-n-Sketch) enable immediate feedback as developers edit code. However, most live environments do not enforce state structure.

## Planning and Agentic Systems

**Hierarchical task network (HTN) planning** (Erol et al. 1994, Ghallab et al. 2004) enables automated planning by decomposing high-level goals into lower-level tasks. HTN planning is practical and widely used in robotics and game AI.

**Goal-oriented agents** (Wooldridge & Jennings 1995, Brooks 1991 on subsumption architecture) model agents as systems that reason about goals and available actions. Explicit FSMs are a natural fit for goal-oriented agent architectures.

**LLM-based agents** (Wei et al. 2022 on chain-of-thought reasoning, Yao et al. 2023 on ReAct) use language models to reason about goals and generate action sequences. Explicit state machines provide a clear interface for agents: "What state is the system in? What transitions are available?"

## Summary of Contributions

This paper's primary contribution is the integration of FSM semantics into a compile-first frontend architecture with the following properties:

1. **Compile-time verification**: The entire FSM state space is analyzed at build time, detecting reachable states, dead code, and type inconsistencies.
2. **Type safety**: FSMs are type-safe by construction; guard expressions and event payloads are checked against the schema.
3. **Observable runtime**: The runtime provides deterministic state visibility, replay, and inspection capabilities.
4. **Natural agent interface**: The explicit FSM structure is a direct interface for automated planning, intent-driven synthesis, and goal-oriented reasoning.
5. **Reactive rendering**: FSM state is automatically propagated to rendering, implementing the reactive programming model.

Compared to XState (best-of-breed FSM library), UX3 adds compile-time verification and type checking. Compared to Elm, UX3 provides JavaScript ecosystem access and less of a learning curve. Compared to React + Redux, UX3 enforces FSM structure and provides compile-time verification rather than relying on developer discipline.

