---
title: "Architecture"
paper: "Live Collaborative Agentic UX: An LLM-Native Host for Stateful Human-AI Workflows"
chapter: 4
---

This chapter describes the architecture of a live collaborative host that combines the dev server, runtime tools, plugins, and sessionful state management.

The host architecture has several layers:

- Runtime state layer: manages widget FSM states, plan state, session state, route state, and user intents in a shared model.
- Agentic orchestration layer: exposes explicit plan creation, execution, stepping, cancellation, and node-update operations so goals can be managed as typed workflow state.
- Knowledge layer: connects indexed content, prompt templates, semantic graph metadata, and project artifacts so agents can make grounded proposals.
- Validation layer: ensures proposed changes pass the same schema, security, and localization checks as authored source.
- Collaboration layer: synchronizes user edits, agent proposals, replay traces, and session events across participants in real time.
- Observation layer: provides invocation history, FSM snapshots, route-aware inspection panels, and event replay so the host can explain itself while running.

The central architectural insight is that an LLM-native host should not hide its cognition. It should expose tools, prompts, resources, plans, and traces as inspectable system elements. That exposed layer is the typed cognitive surface through which humans and agents coordinate with the running system.
