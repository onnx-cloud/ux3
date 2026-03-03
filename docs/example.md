# Quick Worked Example 🚀

Let's walk through a minimal project that uses the `ux3` CLI. 

It assumes you already have Node ≥16 installed.

> **Tip**: you can use the CLI via `npx ux3` or install it globally with `npm install ux3 -g` if you prefer a shell command.

---

## 1. Install the CLI

```bash
# install as a global system command
npm install ux3 -g
```

With the global install you can run `ux3 compile`, `ux3 build`, `ux3 validate` from any directory. 

If you use `npx`, prepend `npx` to the command: `npx ux3 compile`.

---

## 2. Create a new project

The CLI ships with a simple generator that bootstraps a starter application. Run:

```bash
ux3 create hello-world        # or `npx ux3 create hello-world`
cd hello-world
npm install                   # install the newly created dependencies
```

The generated project already contains a minimal `src/` layout, a
`package.json` with helpful scripts, and a sample `ux/view/hello.yaml`
view along with a basic `ux3.config.json`, so you can run
`npm run dev` immediately.
## 3. Inspect or edit the sample view

The generator already added a simple view at `ux/view/hello.yaml`. You
can keep it, modify it, or create new views as needed. The default
content looks like this:

```yaml
# ux/view/hello.yaml
initial: idle
states:
  idle: |
    <div>
      <h1>Hello, UX3!</h1>
      <button ux-event="CLICK">Click me</button>
    </div>
  clicked: 'view/hello/clicked.html'
```

It also created the matching template at `ux/view/hello/clicked.html`:

```html
<!-- ux/view/hello/clicked.html -->
<div>Thanks for clicking!</div>
```

You already have a `ux3.config.json` file in the project root that
points the CLI at `ux/view/**/*.yaml` and an output directory of
`src/generated`; feel free to edit it if your layout changes.

---

## 4. Compile and build

The `compile` command validates and generates TypeScript artifacts. Run it during development or as part of an npm script.

```bash
# development (fast incremental)
npx ux3 compile --config ux3.config.json

# full build (same as `npm run build` if you add a script)
ux3 build --config ux3.config.json
```

**Inside `package.json`** you can add:

```json
"scripts": {
  "compile": "ux3 compile --config ux3.config.json",
  "build": "ux3 build --config ux3.config.json"
}
```

> The `build` command runs the complete pipeline: validate → compile → emit. It also works with global installs.

---

## 5. Run a quick test

Add a tiny test file pointing at the generated types:

```ts
// tests/hello.test.ts
import { expect, test } from 'vitest';
import { Hello } from '../src/generated/ux/view/hello';

test('view type', () => {
  expect(Hello).toBeType(); // compile‑time check only
});
```

Then execute:

```bash
npm run test
```

> The example repository above is essentially this skeleton with a few more files; you can copy it verbatim to get started.

---

## 6. Want more?

* Copy the `examples/iam` project in this repo for a real‑world app and follow the instructions in `examples/iam/README.md`.
* See [docs/compilation.md](compilation.md#cli-commands) for the full CLI reference.
* Open a terminal and type `ux3 --help` to list all available subcommands and flags.

Happy building! 🛠️
