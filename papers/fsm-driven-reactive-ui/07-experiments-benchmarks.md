---
title: "Experiments and Benchmarks"
paper: "FSM-Driven Reactive UI: A Research Agenda for Intent-aware Interfaces"
chapter: 7
---

This chapter defines experimental methods for evaluating FSM-driven user interfaces.

State complexity, maintainability, and bug density are useful metrics. An experiment can compare explicit machine definitions with equivalent component-based implementations to measure defects in event handling and transition logic.

The evaluation should also exploit runtime observability. Instrumentation can record guard evaluations, transition executions, replay traces, and session snapshots. Those traces make it possible to study not just final defects, but the path by which users and agents arrived at a given state.

A strong benchmark therefore includes explanation quality, replay fidelity, and recovery time after a bad transition. These are practical measures of whether machine semantics genuinely improve interactive development and collaborative debugging.
