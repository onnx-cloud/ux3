# @ux3/plugin-tailwind-plus (sample package)

Styling helper plus a tiny UI demonstration that hooks into FSMs, views and
routes. This package is the richest of the three and serves as a cookbook for
using core framework features inside a plugin.

## Features

* Build‑time Tailwind configuration (described in comments, not implemented
  here).
* Runtime stylesheet registration via `app.registerAsset()` – path comes from
  `config.plugins['tailwind-plus'].css`.
* Adds a `useStyle` utility method into `app.utils` for class merging.
* **FSM/View/Route demo**
  * Registers a `dropdown` FSM using `FSMRegistry.register`.
  * Adds a view template `dropdown-demo` with inline `ux-state` binding.
  * Registers a `/dropdown` route programmatically with
    `app.registerRoute`.
  * Supplies a simple `DropdownButton` widget in `src/widget` which interacts
    with the FSM (toggle open/closed).
  * Also includes a `modal` FSM/view which mounts a full‑screen overlay on
    `/modal` – demonstrates a second, independent UI block using the same
    APIs.

### Declarative vs programmatic

The same behaviour could be achieved entirely from the host project by
placing the FSM definition, template and route in the generated config or
`ux3.yaml`:

```yaml
machines:
  dropdown:
    id: dropdown
    initial: closed
    context: { open: false }
    states:
      closed:
        on: { TOGGLE: open }
      open:
        on: { TOGGLE: closed, CLOSE: closed }
        entry: [openAction]
        exit: [closeAction]

routes:
  - path: /dropdown
    view: dropdown-demo

views:
  dropdown-demo: |
    <div ux-state="dropdown">…</div>
```

Plugins generally use the programmatic API when they need to compute values or
when they provide helpers for the host to consume. The tailwind-plus sample
shows both approaches in its README and code.

### Installation

```bash
npm install @ux3/plugin-tailwind-plus
```

Then configure CSS output and optionally add the route/view in your own
`ux3.yaml`, although the plugin does it automatically when installed.
