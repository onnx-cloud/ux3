---
title: "Developer Ergonomics"
paper: "FSM-Driven Reactive UI: A Research Agenda for Intent-aware Interfaces"
chapter: 5
---

This chapter examines developer ergonomics for FSM-based UI authoring.

Declarative state definitions in YAML/HTML make machine structure visible. Developers can review the full state graph in source, which reduces the need to trace imperative event handlers through multiple files.

Tooling for visualization, debugging, and replay is critical. UX3’s explicit machine model enables tools to show active states, available transitions, and event histories. This makes it easier to diagnose why a widget is not behaving as expected.

Reset semantics and state isolation are also important ergonomics concerns. UX3 supports resetting widgets to initial states and isolating nested machine instances. This reduces coupling between sibling widgets and simplifies state reasoning.

The chapter concludes that FSM ergonomics are not inherently more difficult than traditional event-driven development. They impose discipline, but they also make intent, boundaries, and behavior more transparent.
