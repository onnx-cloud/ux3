---
name: observe
title: Plan-Act Observe
description: Prompt for the observation phase after executing a plan step.
---

## Step Result
{{#if observations}}
{{last observations}}
{{/if}}

## Decision
- If all steps are complete, respond with **DONE**
- If more steps remain, respond with **NEXT**
