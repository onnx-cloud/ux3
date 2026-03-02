# Quick Worked Example 🚀

This page walks you through a minimal project that uses the `ux3` CLI. It assumes you already have Node ≥16 installed.

> **Tip**: you can use the CLI via `npx ux3` or install it globally with `npm install ux3 -g` if you prefer a shell command.

---

## 1. Install the CLI

```bash
# local install for a single project
npm install ux3 --save-dev

# or global if you want a system command
npm install ux3 -g
```

With the global install you can run `ux3 compile`, `ux3 build`, `ux3 validate` from any directory. If you use `npx`, prepend `npx` to the command: `npx ux3 compile`.

---

## 2. Create a new project

```bash
mkdir my-app && cd my-app
npm init -y
npm install ux3 --save-dev
```

Create the standard UX3 folders that the compiler expects:

```bash
mkdir -p ux/view ux/style ux/validation ux/i18n ux/token
```

## 3. Add a simple view

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

Create the HTML template for the `clicked` state:

```html
<!-- ux/view/hello/clicked.html -->
<div>Thanks for clicking!</div>
```

A minimal `ux3.config.json` file that tells the CLI where to look:

```json
{
  "views": "ux/view/**/*.yaml",
  "output": "src/generated"
}
```

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
