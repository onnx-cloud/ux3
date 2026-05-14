---
title: "Architecture"
paper: "Compile-First Frontend Architectures for Predictable UX"
chapter: 3
---

This chapter presents the UX3 architecture in concrete terms and explains the role of each compiler stage.

The UX3 build pipeline ingests declarative sources from YAML, HTML, and JSON. It validates them against formal schemas defined in `schema/*.json`, resolves cross-file references, and constructs a canonical representation of views, widgets, and plugin-provided metadata.

A second stage performs static analysis on finite-state machine definitions, i18n keys, and template bindings. This stage enforces invariants such as complete transition coverage, valid guard expressions, and consistent data contracts for invoked services.

The third stage emits generated runtime artifacts under `generated/`. These artifacts include typed view models, widget interfaces, and invocation manifests. At runtime, the UX3 engine operates against these artifacts rather than raw source, preserving the compile-time semantics.

Plugins are integrated into this architecture through extensible metadata contributions. For example, `plugin-onnx` can contribute knowledge-indexed resources and prompt templates, while `plugin-agentic` can contribute planning and execution primitives. The compiler must preserve the same guarantees when incorporating these extensions.
