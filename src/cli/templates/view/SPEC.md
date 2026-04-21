# Template: `view`

Used by: `ux3 generate view <name>`

## Tokens

| Token | Example |
|---|---|
| `[[ name ]]` | `login` (kebab-case slug) |
| `[[ Name ]]` | `Login` (PascalCase) |
| `[[ name_snake ]]` | `login` |
| `[[ NAME ]]` | `LOGIN` |
| `[[ year ]]` | `2026` |
| `[[ date ]]` | `2026-04-21` |

## Files emitted (relative to `ux/view/`)

```
[[ name ]].yaml            — FSM config
[[ name ]]/idle.html       — idle state HTML template
[[ name ]]/submitting.html — submitting state HTML template
[[ name ]]/done.html       — done state HTML template
```

## Conventions

- `initial` must reference an existing state key.
- State values are either a template path string or an object `{ template, invoke, on }`.
- `invoke.src` names a local function in the paired logic file (`src/logic/<name>.logic.ts`).
- `invoke.service` + `invoke.method` call a declared service from `ux/service/*.yaml`.
- Guard expressions in `on` use `ctx` and `event` variables.
- Template paths are relative to the project root, not the view directory.
- One YAML per view; one subdirectory per view for HTML partials.

## FSM shape reference

```yaml
initial: idle
states:
  idle:
    template: view/[[ name ]]/idle.html
    on:
      SUBMIT: submitting
  submitting:
    template: view/[[ name ]]/submitting.html
    invoke:
      src: handle[[ Name ]]Submit     # local logic function
    on:
      SUCCESS: done
      ERROR: idle
  done: view/[[ name ]]/done.html
```

## Example invocation

```bash
ux3 generate view login
ux3 generate view user-profile
```
