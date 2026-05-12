import type { PatternDef } from './resolver.js';

export const reactPattern: PatternDef = {
  id: 'react',
  description: 'Reasoning + Acting loop: think about what to do, act via tools, observe results, repeat.',
  initial: 'think',
  states: {
    think: {
      prompt: `You are in the **Think** phase of the ReAct reasoning loop.

## Context
{{#if observations}}
Recent observations:
{{#each observations}}
- {{this}}
{{/each}}
{{else}}
You are starting a new task.
{{/if}}

## Instructions
1. Analyze the current state and available tools
2. Decide what action to take next
3. If you have enough information to answer, respond directly
4. If you need more information, plan your next tool call

## Output Format
Explain your reasoning briefly, then:
- If calling a tool: specify which tool and why
- If responding: provide the final answer

{{#if decisions}}
Prior decisions:
{{#each decisions}}
- {{this}}
{{/each}}
{{/if}}`,
      invoke: { src: 'sample' },
      on: { RESPOND: 'done', ACT: 'act', CONTINUE: 'think' },
    },
    act: {
      prompt: `Execute the planned action using available tools.

## Decision
{{#if decisions}}
{{last decisions}}
{{/if}}

## Available Tools
Use the most appropriate tool for the task.`,
      invoke: { src: 'executeTool', maxRetries: 1 },
      on: { done: 'observe', error: '#error' },
    },
    observe: {
      prompt: `## Observation
{{#if observations}}
Latest result: {{last observations}}
{{/if}}

## Decision
Evaluate the result:
- If the task is complete, respond with **DONE**
- If more work is needed, respond with **CONTINUE**`,
      invoke: { src: 'sample' },
      on: { DONE: 'done', CONTINUE: 'think' },
    },
    done: { type: 'final' },
  },
};

export const oodaPattern: PatternDef = {
  id: 'ooda',
  description: 'Observe → Orient → Decide → Act loop for sensing and reacting agents.',
  initial: 'observe',
  states: {
    observe: {
      prompt: `You are in the **Observe** phase of the OODA loop.

## Task
Gather information about the current state. What do you see?

{{#if observations}}
Existing observations:
{{#each observations}}
- {{this}}
{{/each}}
{{/if}}

## Instructions
Collect relevant data and context. Report what you observe.`,
      invoke: { src: 'sample' },
      on: { done: 'orient', error: '#error' },
    },
    orient: {
      prompt: `You are in the **Orient** phase.

## Observations
{{#each observations}}
- {{this}}
{{/each}}

## Instructions
Analyze the observations. Identify patterns, anomalies, and relevant context.
Synthesize meaning from the data.`,
      invoke: { src: 'sample' },
      on: { done: 'decide', error: '#error' },
    },
    decide: {
      prompt: `You are in the **Decide** phase.

## Analysis
{{#if decisions}}
{{last decisions}}
{{/if}}

## Instructions
Choose a course of action based on the orientation analysis.
Be specific about what to do and why.`,
      invoke: { src: 'sample' },
      on: { done: 'act', error: '#error' },
    },
    act: {
      prompt: `Execute the chosen action.

## Decision
{{#if decisions}}
{{last decisions}}
{{/if}}

## Instructions
Carry out the action using available tools.`,
      invoke: { src: 'executeTool', maxRetries: 1 },
      on: { done: 'observe', error: '#error' },
    },
    done: { type: 'final' },
  },
};

export const planActPattern: PatternDef = {
  id: 'plan-act',
  description: 'Plan before execution: decompose the task, execute each step, synthesize results.',
  initial: 'plan',
  states: {
    plan: {
      prompt: `You are in the **Plan** phase.

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

Output the plan as a numbered list.`,
      invoke: { src: 'sample' },
      on: { done: 'act', error: '#error' },
    },
    act: {
      prompt: `Execute the current step of the plan.

{{#if decisions}}
Plan: {{last decisions}}
{{/if}}

Current step: step {{iteration}}

Use available tools to execute this step.`,
      invoke: { src: 'executeTool', maxRetries: 1 },
      on: { done: 'observe', error: '#error' },
    },
    observe: {
      prompt: `## Step Result
{{#if observations}}
{{last observations}}
{{/if}}

## Decision
- If all steps are complete, respond with **DONE**
- If more steps remain, respond with **NEXT**`,
      invoke: { src: 'sample' },
      on: { DONE: 'synthesize', NEXT: 'act' },
    },
    synthesize: {
      prompt: `Synthesize all results into a final output.

{{#each observations}}
{{this}}
{{/each}}`,
      invoke: { src: 'sample' },
      on: { done: 'done' },
    },
    done: { type: 'final' },
  },
};

export const chainOfThoughtPattern: PatternDef = {
  id: 'chain-of-thought',
  description: 'Step-by-step reasoning pattern: reason through the problem, then respond.',
  initial: 'reason',
  states: {
    reason: {
      prompt: `You are in the **Reason** phase of the Chain-of-Thought process.

{{#if iteration}}
Iteration: {{iteration}}
{{/if}}

## Instructions
Think step by step through the problem:

1. **Understand**: Restate the problem in your own words
2. **Decompose**: Break it down into sub-problems
3. **Solve**: Work through each sub-problem sequentially
4. **Verify**: Check your reasoning for errors
5. **Decide**: Determine if you need another reasoning pass or can respond

{{#if observations}}
Prior observations:
{{#each observations}}
- {{this}}
{{/each}}
{{/if}}

Output your reasoning as clearly separated steps.`,
      invoke: { src: 'sample' },
      on: { RESPOND: 'respond', CONTINUE: 'reason' },
    },
    respond: {
      prompt: `Synthesize your reasoning into a clear, concise final response.

## Reasoning summary
{{#if observations}}
{{#each observations}}
{{this}}
{{/each}}
{{/if}}`,
      invoke: { src: 'sample' },
      on: { done: 'done' },
    },
    done: { type: 'final' },
  },
};

export const criticPattern: PatternDef = {
  id: 'critic',
  description: 'Generate → Critique → Revise → Finalize loop for output quality improvement.',
  initial: 'generate',
  states: {
    generate: {
      prompt: `Generate an initial output based on the task.

{{#if observations}}
Prior observations:
{{#each observations}}
- {{this}}
{{/each}}
{{/if}}

## Instructions
Produce a complete first draft. Don't worry about perfection yet.`,
      invoke: { src: 'sample' },
      on: { done: 'critique', error: '#error' },
    },
    critique: {
      prompt: `Critically evaluate the last output.

{{#if observations}}
Current output:
{{last observations}}
{{/if}}

## Instructions
1. Identify issues: accuracy, completeness, clarity, tone, structure
2. Rate the output on a scale of 1-10
3. If rating >= 8, respond with **ACCEPT**
4. Otherwise, list specific improvements needed and respond with **REVISE**`,
      invoke: { src: 'sample' },
      on: { ACCEPT: 'finalize', REVISE: 'revise', error: '#error' },
    },
    revise: {
      prompt: `Revise the output based on critique feedback.

{{#if observations}}
Current output: {{last observations}}
Critique: {{last observations}}
{{/if}}

## Instructions
Incorporate the critique feedback. Produce a new, improved version.`,
      invoke: { src: 'sample' },
      on: { done: 'critique', error: '#error' },
    },
    finalize: {
      prompt: `Finalize the output. Perform a final quality check and present the result.

{{#if observations}}
{{last observations}}
{{/if}}`,
      invoke: { src: 'sample' },
      on: { done: 'done' },
    },
    done: { type: 'final' },
  },
};

export const allPatterns: PatternDef[] = [
  reactPattern,
  oodaPattern,
  planActPattern,
  chainOfThoughtPattern,
  criticPattern,
];
