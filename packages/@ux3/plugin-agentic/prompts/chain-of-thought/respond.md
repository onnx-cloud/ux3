---
name: respond
title: Chain-of-Thought Respond
description: Prompt for synthesizing the reasoning into a final response.
---

Synthesize your reasoning into a clear, concise final response.

## Reasoning summary
{{#if observations}}
{{#each observations}}
{{this}}
{{/each}}
{{/if}}
