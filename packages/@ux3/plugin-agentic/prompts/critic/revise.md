---
name: revise
title: Critic Revise
description: Prompt for revising output after critique.
---

Revise the output based on critique feedback.

{{#if observations}}
Current output: {{observations.[-2]}}
Critique: {{observations.[-1]}}
{{/if}}

## Instructions
Incorporate the critique feedback. Produce a new, improved version.
