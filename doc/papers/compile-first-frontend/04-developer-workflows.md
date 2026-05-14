---
title: "Developer Workflows"
paper: "Compile-First Frontend Architectures for Predictable UX"
chapter: 4
---

This chapter documents developer workflows enabled by UX3’s compile-first model.

Authoring widgets in YAML, HTML, and JSON provides clear structure. Developers express state machines, templates, and invoked side effects declaratively, enabling the compiler to provide rapid feedback on schema compliance and guard accuracy.

Fast feedback loops are a critical part of the workflow. The UX3 command-line tool validates application source and emits generated artifacts quickly, allowing developers to catch issues before runtime. Tests can be written against the generated contracts, which improves coverage and reduces regressions.

A typical widget lifecycle starts with a declarative spec, proceeds through compilation and validation, and ends with runtime execution against generated artifacts. This process increases confidence because the runtime behavior is directly derived from a statically validated model.

Plugin integration is also a workflow consideration. Activating plugins such as `plugin-agentic` or `plugin-onnx` extends the compiler schema and adds new tool contracts. Developers benefit from this extensibility while still retaining the compile-time checks of the core UX3 pipeline.
