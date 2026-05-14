---
title: "Formalism and Goal Semantics"
paper: "Live Collaborative Agentic UX: An LLM-Native Host for Stateful Human-AI Workflows"
chapter: 6
---

This chapter formalizes how goals, plans, and state are represented in a live host.

Goals are treated as first-class entities with properties such as desired outcome, scope, priority, and success criteria. Plans are hierarchical graphs whose nodes can be human tasks, agent actions, tool calls, or widget changes. State is represented as a combination of current FSM state, plan state, and collaborative session context.

The chapter defines the semantics of operational self-knowledge:

- `Knowledge := {artifact, provenance, timestamp, author, context}`
- `Goal := {id, description, owner, status, successCriteria}`
- `Plan := {nodes, dependencies, state, history}`
- `Session := {mode, route, snapshots, invocations, participants}`

These formalisms support explicit reasoning about intent and allow the host to answer queries such as what goal a proposal serves, whether a plan node reflects validated state, and which prior observations justify the next step.

A lightweight math layer can further express these relations in stable semantic form, which suggests a path toward latex-lite formal appendices and machine-checkable interaction semantics.
