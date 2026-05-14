import type { PatternDef } from './resolver.js';

export const reactPattern: PatternDef = {
  id: 'react',
  description: 'Reasoning + Acting loop: think about what to do, act via tools, observe results, repeat.',
  initial: 'think',
  states: {
    think: {
      template: '../prompts/react/think.md',
      invoke: { src: 'sample' },
      on: { RESPOND: 'done', ACT: 'act', CONTINUE: 'think' },
    },
    act: {
      template: '../prompts/react/act.md',
      invoke: { src: 'executeTool', maxRetries: 1 },
      on: { done: 'observe', error: '#error' },
    },
    observe: {
      template: '../prompts/react/observe.md',
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
      template: '../prompts/ooda/observe.md',
      invoke: { src: 'sample' },
      on: { done: 'orient', error: '#error' },
    },
    orient: {
      template: '../prompts/ooda/orient.md',
      invoke: { src: 'sample' },
      on: { done: 'decide', error: '#error' },
    },
    decide: {
      template: '../prompts/ooda/decide.md',
      invoke: { src: 'sample' },
      on: { done: 'act', error: '#error' },
    },
    act: {
      template: '../prompts/ooda/act.md',
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
      template: '../prompts/plan-act/plan.md',
      invoke: { src: 'sample' },
      on: { done: 'act', error: '#error' },
    },
    act: {
      template: '../prompts/plan-act/act.md',
      invoke: { src: 'executeTool', maxRetries: 1 },
      on: { done: 'observe', error: '#error' },
    },
    observe: {
      template: '../prompts/plan-act/observe.md',
      invoke: { src: 'sample' },
      on: { DONE: 'synthesize', NEXT: 'act' },
    },
    synthesize: {
      template: '../prompts/plan-act/synthesize.md',
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
      template: '../prompts/chain-of-thought/reason.md',
      invoke: { src: 'sample' },
      on: { RESPOND: 'respond', CONTINUE: 'reason' },
    },
    respond: {
      template: '../prompts/chain-of-thought/respond.md',
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
      template: '../prompts/critic/generate.md',
      invoke: { src: 'sample' },
      on: { done: 'critique', error: '#error' },
    },
    critique: {
      template: '../prompts/critic/critique.md',
      invoke: { src: 'sample' },
      on: { ACCEPT: 'finalize', REVISE: 'revise', error: '#error' },
    },
    revise: {
      template: '../prompts/critic/revise.md',
      invoke: { src: 'sample' },
      on: { done: 'critique', error: '#error' },
    },
    finalize: {
      template: '../prompts/critic/finalize.md',
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
