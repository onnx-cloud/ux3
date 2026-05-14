---
title: "Research Agenda"
paper: "Model-Assisted Widget Synthesis: Bridging Declarative UX and Runtime Adaptation"
chapter: 5
---

This chapter defines a research agenda for model-assisted widget synthesis.

Evaluating quality and consistency requires metrics for suggestion precision, compilation pass rate, author acceptance, and recovery after incorrect proposals. A useful study compares model-assisted proposals with manual authoring to determine whether assistance improves speed without sacrificing correctness.

A central research problem is distinguishing tool-grounded reasoning from interpolation. The agenda should separate proposals that rely on explicit metadata, live host state, search results, and plan context from proposals that merely imitate prior examples. One important metric is semantic fidelity to the declared schema and current session context.

Human-in-the-loop workflows are also a research priority. The paper should explore interfaces for presenting suggestions, capturing feedback, recording decisions, and replaying proposal histories so that future agents can learn from accepted and rejected changes.

Responsible guardrails remain necessary. The compiler should reject suggestions that violate security, accessibility, or policy constraints, while the host should preserve enough evidence to explain why a proposal was made and why it was accepted or rejected.
