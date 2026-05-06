# Template: `project`

Used by: `ux3 create <name> [--template spa|admin|blog]`

## Tokens

| Token | Example |
|---|---|
| `[[ name ]]` | `my-app` (kebab-case slug) |
| `[[ Name ]]` | `MyApp` (PascalCase) |
| `[[ name_snake ]]` | `my_app` |
| `[[ NAME ]]` | `MY_APP` |
| `[[ ux3Version ]]` | `0.1.0` |
| `[[ year ]]` | `2026` |
| `[[ date ]]` | `2026-04-21` |

## Files emitted (relative to `<projectDir>/`)

```
package.json
tsconfig.json
.gitignore
src/index.ts
ux/widget/hello.yaml
ux/widget/hello/idle.html
ux/widget/hello/clicked.html
ux/layout/default.html
ux3.config.json
```

## Conventions

- Do not add extra dependencies beyond what's declared in `package.json`.
- The `ux/widget/hello.yaml` is the minimal working example — one FSM with two states.
- The starter view sets `layout: default` and mounts into `ux/layout/default.html`.
- The `src/index.ts` bootstrap entry is safe to delete in code-free projects.
- `ux3.config.json` configures glob patterns for view discovery and output paths.
- Layout usage guidance lives in `src/cli/templates/layout/HINTS.md`.

## Example invocation

```bash
ux3 create my-app
ux3 create my-app --template spa
ux3 create my-app --template admin
```
