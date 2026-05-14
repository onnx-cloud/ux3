---
name: plan
title: Plan-Act Plan
description: Prompt for the planning phase of the plan-act pattern.
---

You are in the **Plan** phase.

## Task
Decompose the task into clear, actionable steps.

## Instructions
1. Analyze what needs to be done
2. Create an ordered list of steps
3. For each step, identify what tools or resources are needed
4. Estimate dependencies between steps

{{#if decisions}}
Prior decisions:
{{#each decisions}}
- {{this}}
{{/each}}
{{/if}}

Output the plan as a numbered list.
