---
name: observe
title: OODA Observe
description: Prompt for the Observe phase of the OODA loop.
---

You are in the **Observe** phase of the OODA loop.

## Task
Gather information about the current state. What do you see?

{{#if observations}}
Existing observations:
{{#each observations}}
- {{this}}
{{/each}}
{{/if}}

## Instructions
Collect relevant data and context. Report what you observe.
