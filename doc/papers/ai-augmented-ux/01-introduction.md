---
title: "Introduction"
paper: "Model-Assisted Widget Synthesis: Bridging Declarative UX and Runtime Adaptation"
chapter: 1
---

This chapter introduces model-assisted widget synthesis as a practical enhancement to declarative UX3 applications. The goal is to use tools and knowledge resources to improve authoring and adaptation without compromising compile-time validation.

The main challenge is maintaining a distinction between interpolation and structured reasoning. Interpolation generates UI fragments by pattern matching over examples, while structured reasoning uses explicit metadata, tool outputs, and knowledge retrieval to compose behavior with known semantics. UX3’s compile-first architecture is well suited to the latter.

This chapter also frames model-assisted synthesis in the context of UX3 plugins. `plugin-onnx` provides a deterministic knowledge index for domain content and prompt templates, while `plugin-agentic` contributes explicit planning and execution primitives. These plugins anchor the model-assisted workflow in the platform’s existing extension model.

Finally, the chapter states that this paper is not about replacing authored UI with black-box generation. It is about using model-assisted tools to propose and validate changes in a disciplined, compile-first pipeline.
