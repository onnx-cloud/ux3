---
name: critique
title: Critic Critique
description: Prompt for evaluating the last output in the critic pattern.
---

Critically evaluate the last output.

{{#if observations}}
Current output:
{{observations.[-1]}}
{{/if}}

## Instructions
1. Identify issues: accuracy, completeness, clarity, tone, structure
2. Rate the output on a scale of 1-10
3. If rating >= 8, respond with **ACCEPT**
4. Otherwise, list specific improvements needed and respond with **REVISE**
