---
name: observe
title: ReAct Observe
description: Prompt for the Observe phase of the ReAct pattern.
---

## Observation
{{#if observations}}
Latest result: {{last observations}}
{{/if}}

## Decision
Evaluate the result:
- If the task is complete, respond with **DONE**
- If more work is needed, respond with **CONTINUE**
