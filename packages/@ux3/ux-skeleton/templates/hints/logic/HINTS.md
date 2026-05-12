# UX Logic Hints

`src/logic/` contains local event handlers used by view FSM invokes.

## What belongs here

- View-specific handler functions for business actions and orchestration.
- Side-effect coordination that is too specific for shared services.

## Runtime role

- FSM states can call logic handlers via `invoke.src`.
- Handlers receive `ctx` and `event`, then either:
  - Complete successfully (normal transition path), or
  - Throw/fail for error transitions and recovery flows.

## Authoring conventions

- Keep one logic file per view domain when possible.
- Use stable handler names so view YAML references remain readable.
- Keep handlers thin: delegate transport/data access to services.
- Avoid direct DOM work in logic handlers.

## Reliability guidance

- Validate incoming event payload shape before use.
- Throw explicit, meaningful errors for failure branches.
- Keep async flows idempotent where retry behavior is possible.

## Reference shape

```typescript
import type { FSMContext, FSMEvent } from '@ux3/core';

export async function handleLoginSubmit(
  ctx: FSMContext,
  event: FSMEvent
): Promise<void> {
  // orchestrate local flow; throw for error paths
}
```
