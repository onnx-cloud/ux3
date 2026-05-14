---
title: "Experiments and Benchmarks"
paper: "FSM-Driven Reactive UI: A Research Agenda for Intent-aware Interfaces"
chapter: 7
---

This chapter defines experimental methods for evaluating FSM-driven UIs.

State complexity, maintainability, and bug density are useful metrics. An experiment can compare UX3’s explicit machine definitions with equivalent component-based implementations to measure defects in event handling and transition logic.

Comparisons should also include developer effort. Participants can be asked to extend an existing interface or fix a broken flow, and the study can record the time required to understand the behavior and implement the change.

Instrumentation-based measurement is valuable. UX3 can record guard evaluations, transition executions, and state snapshots. These data provide insight into how the machine is used in practice and where simplification may be beneficial.

The chapter emphasizes that qualitative developer feedback should accompany quantitative metrics. FSM-driven UIs are valuable when they improve observability and reduce cognitive load, not merely when they reduce defect counts.
