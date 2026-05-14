---
title: "Human-AI Workflows"
paper: "Live Collaborative Agentic UX: An LLM-Native Host for Stateful Human-AI Workflows"
chapter: 5
---

This chapter describes the human-AI workflows that a live host supports.

There are four primary workflow modes:

- Goal capture: users express high-level objectives such as improving a flow or adding a capability. The host converts these into structured goals and context for agents.
- Proposal review: agents generate candidate changes, scaffolds, or plan steps and present them alongside provenance, validation status, and risk indicators.
- Co-execution: users and agents jointly execute plans, update widget states, and track progress through a shared session model.
- Steering: users can interrupt, redirect, or reprioritize a live agent workflow rather than waiting for a full turn to complete.

The chapter also covers the role of self-documentation. Every action, accepted proposal, and plan revision becomes part of the host’s evidence graph, enabling later queries such as why a transition was added, what assumptions were used, and which tool outputs shaped the result.

Human steering is decisive. Users can approve, modify, reject, queue, block, or steer suggestions, and the host adapts by refining future proposals while preserving explicit intent history.
