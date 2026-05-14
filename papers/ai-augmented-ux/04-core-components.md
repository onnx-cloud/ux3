---
title: "Core Components"
paper: "Model-Assisted Widget Synthesis: Bridging Declarative UX and Runtime Adaptation"
chapter: 4
---

This chapter specifies the core components of a model-assisted pipeline.

A synthesis engine proposes new widget patterns based on existing metadata. It generates scaffolded definitions for forms, validation flows, and stateful widgets that conform to declared schemas and available plugin abstractions.

Local and remote inference are combined with validation. Local tools such as deterministic search indices and semantic graph lookups offer predictable retrieval. Remote model suggestions may provide broader context, but they are subject to the compiler’s validation rules before acceptance.

A session layer is equally important. Agent sessions can run in blocking, queueing, or steering modes; plan state can be created and stepped explicitly; and invocation history can be retained as machine-readable evidence. Together with tools, prompts, and knowledge resources, these components form a typed cognitive surface that makes model assistance collaborative and revisable rather than one-shot.

Semantic diffing is essential. The compiler compares proposed changes with existing widget definitions at the level of states, transitions, and contracts. This prevents opaque alterations and ensures that developer review can focus on semantic differences.
