---
name: act
title: Plan-Act Act
description: Prompt for the action execution phase of the plan-act pattern.
---

Execute the current step of the plan.

{{#if decisions}}
Plan: {{last decisions}}
{{/if}}

Current step: step {{iteration}}

Use available tools to execute this step.
