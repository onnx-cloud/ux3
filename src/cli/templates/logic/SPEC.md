# Template: `logic`

Used by: `ux3 generate logic <name>`

## Tokens

| Token | Example |
|---|---|
| `[[ name ]]` | `login` |
| `[[ Name ]]` | `Login` |
| `[[ name_snake ]]` | `login` |
| `[[ NAME ]]` | `LOGIN` |
| `[[ date ]]` | `2026-04-21` |

## Files emitted (relative to `src/logic/`)

```
[[ name ]].logic.ts   — typed FSM handler stubs
```

## Conventions

- One logic file per view; file name must match the view slug.
- Handler functions are named `handle<Name><Event>` (PascalCase event).
- `ctx` is the FSM context object (typed from generated types if available).
- `event` carries `{ type, payload }`.
- Throw or return `{ error: true }` to signal ERROR transitions.
- Return nothing (or `undefined`) to signal SUCCESS.
- Do NOT import from `generated/` directly — import from `@ux3/core` types only.

## Handler signature

```typescript
import type { FSMContext, FSMEvent } from '@ux3/core';

export async function handle[[ Name ]]Submit(
  ctx: FSMContext,
  event: FSMEvent
): Promise<void> {
  // throw on error, return normally on success
}
```

## Example invocation

```bash
ux3 generate logic login
ux3 generate logic user-profile
```
