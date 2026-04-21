# Template: `plugin`

Used by: `ux3 generate plugin <name>` (also aliased as `ux3 plugin create <name>`)

## Tokens

| Token | Example |
|---|---|
| `[[ name ]]` | `analytics` (bare slug, no `plugin-` prefix) |
| `[[ Name ]]` | `Analytics` (PascalCase) |
| `[[ NAME ]]` | `ANALYTICS` |
| `[[ ux3Version ]]` | `0.1.0` |
| `[[ date ]]` | `2026-04-21` |

## Files emitted (into `packages/@ux3/plugin-[[ name ]]/`)

```
package.json
tsconfig.json
src/index.ts
```

## Conventions

- Package name is always `@ux3/plugin-<name>`.
- The default export must be a `Plugin` object (not a class).
- `install(_app)` is the only required method; use it to register components, services, hooks.
- Do NOT export anything other than the default plugin object from `src/index.ts`.
- Peer-depend on `@ux3/ux3`, not on specific sub-packages.
- Plugin slug must be lowercase kebab-case (no `plugin-` prefix in the name arg).

## Plugin shape

```typescript
import type { Plugin } from '@ux3/ux3';

const [[ name ]]: Plugin = {
  name: '@ux3/plugin-[[ name ]]',
  version: '0.1.0',
  ux3PeerVersion: '^[[ ux3Version ]]',
  description: '[[ Name ]] plugin for UX3.',
  install(_app) {
    // register here
  },
};

export default [[ name ]];
```

## Example invocation

```bash
ux3 generate plugin analytics
ux3 generate plugin stripe
```
