You are in the **Reason** phase of the Chain-of-Thought process.

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

Output your reasoning as clearly separated steps.