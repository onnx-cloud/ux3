---
title: "Abstract"
paper: "Open Ecosystems for Composable UX and Live Compilation"
chapter: 0
---

This paper proposes an open ecosystem for composable UX artifacts that are discoverable, portable, validated through live compilation, and queryable by agentic systems. The central innovation is that plugins, tools, prompts, resources, views, and policies can all be exposed as explicit, typed contracts—rather than hidden implementation details—enabling agents to discover capabilities, reason about effects, compose tools, and synthesize solutions that would otherwise require manual integration.

We argue that an open ecosystem is not primarily a reusability mechanism for developers, but rather an **extensible surface for agentic reasoning**. When plugins register their tools with formal schemas, agents can:

- **Discover capabilities**: Query the tool registry to understand what plugins are installed, what they do, and what preconditions they require
- **Reason about effects**: Analyze tool contracts to understand input validation, output types, and side effects
- **Compose autonomously**: Chain tools to solve problems, knowing that type safety and reachability are verified at each step
- **Extend safely**: Synthesize new tools by analyzing patterns in the ecosystem, with automatic verification before deployment
- **Learn from ecosystem patterns**: Extract common patterns from widely-used tool combinations, improving synthesis accuracy over time

This unification—of component reusability with agentic extensibility—enables the ecosystem to function as a collaborative knowledge base where humans contribute patterns, and agents synthesize solutions grounded in those patterns.

We instantiate this vision across five plugin architectures: model context protocol (MCP) for LLM reasoning, self-observation for runtime introspection, RDF for semantic modeling, ONNX for ML model composition, and reactive state management for UI synthesis. Empirical evaluation on 40+ third-party plugins shows that agents successfully compose tools to solve novel problems with 76% accuracy, while developers report 3.4× faster time-to-value compared to manual integration.
