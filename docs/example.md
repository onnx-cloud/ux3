# Quick Worked Example

Let's walk through creating and building a minimal UX3 application. This example assumes Node ≥16 is already installed.

---

## 1. Clone an example

The best way to get started is to copy an existing example. Clone this repository and navigate to an example:

```bash
git clone https://github.com/onnx-cloud/ux3.git
cd ux3/examples/todo
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` by default. Open it and you'll see a working FSM-driven app.

---

## 2. Inspect the view structure

Views live in `src/ux/view/**/*.yaml`. Open `src/ux/view/todo.yaml`:

```yaml
# src/ux/view/todo.yaml
initial: idle
states:
  idle: |
    <div>
      <h1>My Todo App</h1>
      <button ux-event="ADD">Add Item</button>
    </div>
  adding: 'todo/form.html'
  added: 'todo/success.html'
```

Each FSM state can be:
- An inline template string (using `|` or `|-`)
- A file reference like `'todo/form.html'`

Related templates live in adjacent folders: `src/ux/view/todo/form.html`, etc.

```html
<!-- src/ux/view/todo/form.html -->
<div>
  <h1>Add a new item</h1>
  <input ux-event="SUBMIT" />
</div>
```

---

## 3. Understand the build pipeline

The framework is compile-first: YAML views are validated, type-checked, and compiled into TypeScript artifacts before runtime. Use npm scripts to trigger this:

```bash
# Development (watch mode + dev server)
npm run dev

# Full production build
npm run build

# Type-check and linting
npm run type-check
npm run lint
```

These scripts invoke the `@ux3/cli` package. The pipeline:
1. **Validate** – Check YAML schema and i18n keys
2. **Compile** – Generate TypeScript types in `src/generated/`
3. **Type-check** – Ensure all references are sound
4. **Emit** – Output optimized runtime code

---

## 4. Add a test

Tests reference generated types to ensure type safety:

```ts
// tests/todo.test.ts
import { describe, it, expect } from 'vitest';
import { FSMRegistry } from '@ux3/core';

describe('Todo FSM', () => {
  it('should register the todo view', () => {
    const fsm = FSMRegistry.get('todo');
    expect(fsm).toBeDefined();
    expect(fsm.initialState).toBe('idle');
  });

  afterEach(() => {
    FSMRegistry.clear();
  });
});
```

Run tests with:

```bash
npm run test              # run once
npm run test:watch       # watch mode
npm run test:e2e:debug   # Playwright e2e with browser
```

---

## 5. Run the full example

For a production-grade reference implementation, explore `examples/iam`:

```bash
cd examples/iam
npm install
npm run dev
```

This demonstrates:
- Store for state management
- Form validation and submission
- Routing and navigation
- Service declarations and HTTP calls
- i18n integration
- Declarative scenarios (`tests/decl/`) and e2e specs (`tests/e2e/`)

See the [IAM example notes](../examples/iam/README.md) for more details.

---

## 6. Key reference docs

- **Framework core**: [docs/fsm-core.md](fsm-core.md)
- **Build pipeline**: [docs/compilation.md](compilation.md)
- **View system**: [docs/views.md](views.md)
- **Styling**: [docs/ux-style.md](ux-style.md)
- **i18n**: [docs/i18n.md](i18n.md)
- **Services & side-effects**: [docs/services.md](services.md)
- **Testing**: [docs/testing-guides.md](testing-guides.md)

Happy building!
