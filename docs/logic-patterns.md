# Logic Module Patterns

The UX3 FSM/view system now supports external *logic modules* that contain
guards, actions, entry/exit callbacks and helpers. Logic lives alongside
views under `ux/logic/<view>.ts` and is completely optional.

## YAML syntax

A typical view definition with logic references looks like:

```yaml
initial: idle
states:
  idle:
    on:
      GO:
        target: idle
        guard: checkAuthorization
        actions: [logClick]
    entry: initialize
    exit: cleanup
```

Precise rules:

* `guard`, `actions`, `entry`, `exit` and `invoke.src` fields may contain
  string names. When the view compiler encounters a string it will turn it
  into `(logic.name || shared.name)` in the generated code.
* Actions may also be an array of names.
* If a logic file does not exist the compiler emits a diagnostic listing all
  referenced names.
* If a logic module exists but fails to export a referenced name the compiler
  emits a warning naming the missing symbol.

## Logic modules

Each logic module is a plain TypeScript file exporting functions. The
compiler will auto-import the module when `ux-view` code is generated and
populate a small JSON manifest alongside the generated view, for example:

```json
{
  "guards": ["checkAuthorization"],
  "actions": ["logClick"],
  "entry": ["initialize"],
  "exit": ["cleanup"],
  "invokes": []
}
```

A shared utility file `ux/logic/shared.ts` may export helpers used by multiple
views.

Function signatures are flexible but should match the TypeScript aliases
provided in `src/fsm/types.ts`:

```ts
export type GuardFn<T> = (context: T) => boolean;
export type ActionFn<T> = 
  (context: T, event: StateEvent) => void | Partial<T> | Promise<Partial<T>>;
export type InvokerFn<T, R> = (context: T, input?: any) => Promise<R>;
```

## Linting & tooling

A new CLI health check can detect exported functions that are never
referenced by any view:

```bash
npx ux3 check --logic
```

You can also generate manifests as part of compilation using `--logic-manifest`:

```bash
npx ux3 compile --views ux/view --output generated --logic-manifest
```

## Migration notes

Existing projects using inline guards/actions in the view YAML can migrate by
moving the functions into a `ux/logic/<view>.ts` file, updating the YAML to
refer to the new names, and running the linter to catch forgotten exports.

For a step-by-step migration guide, see `docs/migration-logic.md` (TODO).
