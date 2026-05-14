---
title: "Core Components"
paper: "Model-Assisted Widget Synthesis: Bridging Declarative UX and Runtime Adaptation"
chapter: 4
---

This chapter specifies the core components of a model-assisted UX3 pipeline.

A synthesis engine proposes new widget patterns based on existing metadata. It generates scaffolded definitions for forms, validation flows, and stateful widgets that conform to declared schemas and available plugin abstractions.

Local and remote inference are combined with validation. Local tools such as `plugin-onnx` and RDF-based metadata lookups offer predictable, deterministic retrieval. Remote model suggestions may provide broader context, but they are subject to the compiler’s validation rules before acceptance.

Semantic diffing is essential. The compiler compares proposed changes with existing widget definitions at the level of states, transitions, and contracts. This prevents opaque alterations and ensures that developer review can focus on semantic differences.

The chapter also emphasizes prompt and metadata handling. `plugin-onnx` prompt selection can choose templates based on query intent, while `plugin-rdf` can provide semantic tags that enrich the generated widget metadata.
