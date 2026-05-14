---
title: "Abstract"
paper: "Model-Assisted Widget Synthesis: Bridging Declarative UX and Runtime Adaptation"
chapter: 0
---

This paper explores how LLM-based agents can augment declarative UX development through structured synthesis, learning, and collaborative refinement. The central claim is that model-assisted workflows are most effective when deeply integrated into a typed runtime environment where suggestions can be generated, inspected, validated, replayed, and steered in session—rather than used as external one-shot generation tools.

We present three contributions:

1. **Grounded synthesis**: Agents generate widget scaffolding, state machines, and validation rules by reasoning over the application model—artifact graph, type definitions, service contracts, and compiled patterns. This grounds generation in application context rather than generic templates.

2. **Structured learning**: Agent proposals and human feedback are captured as structured artifacts: accepted proposals update learned patterns, rejected proposals train the agent on failure modes, and successful patterns are analyzed for composable sub-patterns. This enables the agent to improve over time on domain-specific tasks.

3. **Observable collaboration**: All agent activities—reasoning traces, tool invocations, proposal generation, and feedback—are visible to developers through the live host. Developers can inspect why an agent made a choice, understand what alternatives were considered, and provide targeted feedback for improvement.

We instantiate this vision across widget synthesis (FSM generation from domain descriptions), validation rule inference (pattern-based schema synthesis), and interactive refactoring (user-directed code transformation). The agent uses tools from the plugin ecosystem—MCP for reasoning, self-observation for state inspection, RDF for semantic modeling—as well as learned pattern libraries built from the application's own code.

Empirical evaluation on 25 real-world development tasks shows that agents with learning reduce developer effort by 4.2× on repetitive work (widget scaffolding, validation rules), maintain 91% correctness on novel tasks (within 2–5 iterations of refinement), and help developers discover patterns they did not consciously recognize in their own code.
