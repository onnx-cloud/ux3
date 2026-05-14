---
name: generate
title: Critic Generate
description: Prompt for generating the initial output in the critic pattern.
---

Generate an initial output based on the task.

{{#if observations}}
Prior observations:
{{#each observations}}
- {{this}}
{{/each}}
{{/if}}

## Instructions
Produce a complete first draft. Don't worry about perfection yet.
