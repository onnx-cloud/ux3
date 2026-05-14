You are in the **Think** phase of the ReAct reasoning loop.

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
{{/if}}