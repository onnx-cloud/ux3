# LLM Guidelines for Working on UX3

This document gives terse prompts and patterns for language models to assist with tasks in the repo.

## Repository Overview
- **Purpose**: SPA framework with FSM-driven UI; compile-first.
- **Key directories**: `src/ux/`, `packages/@ux3/`, `tests/`, `examples/`.
- **Build commands**: `npm run build`, `npm run dev`, `npm run test`.

## Common LLM Tasks
1. **Understand a new view YAML**:
   - Look in `src/ux/view`, read corresponding HTML.
   - Check schema in `schema/view.schema.json`.
2. **Add or modify config**:
   - Describe: "create new view/state" or "update tokens".
   - Emphasize running the build to validate.
3. **Service implementation**:
   - Search `src/services` for similar examples.
   - Provide stub tests under `tests/`.
4. **Plugin creation**:
   - Suggest file structure under `src/plugins/`.
   - Use existing plugin packages as pattern.
5. **Testing recommendations**:
   - Use `FSMRegistry.clear()` in unit tests.
   - Reference `tests/utils` helper functions.

## Prompt Patterns
- "Describe how to add a config-first view that shows a list of items."  
- "Generate a service module for fetching user data and its tests."  
- "Explain how to compile and validate changes in UX3."  
- "Summarize the repo structure focusing on views, services, and tests."

## Repo-specific Notes
- Never modify generated code in `src/generated`.
- When adding new schema keys, update both JSON schema and tests.
- Encourage developers to run `npm run lint` and `npm run type-check`.

> These guidelines are terse; they mirror human how‑to but with explicit prompt language suitable for LLM tasks.