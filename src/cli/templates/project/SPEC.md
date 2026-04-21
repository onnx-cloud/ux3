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
ux/view/hello.yaml
ux/view/hello/idle.html
ux/view/hello/clicked.html
ux3.config.json
```

## Conventions

- Do not add extra dependencies beyond what's declared in `package.json`.
- The `ux/view/hello.yaml` is the minimal working example — one FSM with two states.
- The `src/index.ts` bootstrap entry is safe to delete in code-free projects.
- `ux3.config.json` configures glob patterns for view discovery and output paths.
- No layout files are scaffolded by default — add `ux/layout/default.html` when needed.

## Example invocation

```bash
ux3 create my-app
ux3 create my-app --template spa
ux3 create my-app --template admin
```
