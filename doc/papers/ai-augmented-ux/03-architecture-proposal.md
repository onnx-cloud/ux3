---
title: "Architecture Proposal"
paper: "Model-Assisted Widget Synthesis: Bridging Declarative UX and Runtime Adaptation"
chapter: 3
---

This chapter describes a concrete architecture for model-assisted widget synthesis in UX3.

Declarative widget metadata is treated as model input. UX3 source definitions include state declarations, transition guards, service invocation contracts, and plugin metadata. A model-assisted system can consume this structured input to generate or refine widget proposals.

Runtime adaptation is implemented through deterministic lookups and controlled suggestion layers. `plugin-onnx` supplies a FlatBuffer-backed search index for domain content and prompt templates, while `plugin-rdf`/JSON-LD provides semantic annotations for intent and entity relationships. These resources are accessed through explicit MCP tools.

Fidelity constraints are enforced by the compiler. Proposed changes must pass the same schema validation, i18n resolution, and security checks as authored source. The model-assisted layer therefore functions as an advisor rather than a runtime executor.

Examples include using `plugin-onnx` for prompt/template selection and using `plugin-agentic` to connect plan status with UI presentation. This architecture maintains the compile-first guarantees while introducing deterministic assistance.
