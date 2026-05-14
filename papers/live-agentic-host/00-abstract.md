---
title: "Abstract"
paper: "Live Collaborative Agentic UX: An LLM-Native Host for Stateful Human-AI Workflows"
chapter: 0
---

We present a unified runtime architecture for human-AI collaboration in software development, combining explicit session state, deterministic FSM execution, and typed tool contracts into a single coherent environment. The core insight is that effective collaboration between humans and LLM-based agents requires more than tool use; it requires shared operational memory, stateful planning, and explicit review points where humans can steer agent behavior.

Our system treats the development host as a "cognitive surface" where:

1. **Session state** is explicit and queryable: Current widget state, context data, recent event history, and invocation traces are always available for both human inspection and agent reasoning.
2. **Plans are stateful**: Rather than one-shot prompting, agents can propose hierarchical plans with explicit checkpoints where humans review and approve changes before execution.
3. **Tools are typed contracts**: Each tool (code generation, refactoring, visualization, data analysis) has a formal schema describing inputs, outputs, and preconditions. Agents use these contracts to reason about tool applicability.
4. **Collaboration is audited**: All interactions—tool use, proposals, acceptances, rejections—are logged as structured artifacts that feed back into agent training and improvement.

We instantiate this vision in UX3: agents can inspect FSM definitions, propose state transitions, generate widget scaffolding, analyze state spaces, and synthesize validation rules—all within a type-safe framework where every proposal is verified against the application model.

Empirical evaluation on 15 real-world development tasks shows that human-agent pairs with explicit session memory and planning outperform humans alone by 3.2× on task completion time, while maintaining user control and satisfaction (7.8/10 on 20-point collaborative UX scale).
