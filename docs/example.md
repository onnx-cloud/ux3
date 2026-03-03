# Quick Worked Example

Let's walk through creating and building a minimal UX3 application. This example assumes Node ≥16 is already installed.

---

## 1. Clone an example

The best way to get started is to copy an existing example. Clone this repository and navigate to an example:

```bash
git clone https://github.com/onnx-cloud/ux3.git
cd ux3/examples/kanban
ux3 dev
```

The dev server starts at `http://localhost:5173` by default. Open it and you'll see a working FSM-driven app.

---

## 2. Inspect the view structure

Views live in `ux/view/**/*.yaml`. Open `ux/view/login.yaml`:

```yaml
# ux/view/login.yaml
name: Login
layout: default
initial: idle
states:
  idle:
    template: 'view/login/idle.html'
    on:
      SUBMIT: validating
  validating:
    template: 'view/login/validating.html'
    invoke:
      service: auth
      method: login
    on:
      SUCCESS: success
      ERROR: error
  success:
    template: 'view/login/success.html'
  error:
    template: 'view/login/error.html'
    on:
      RETRY: idle
```

Each state specifies a `template:` file path (relative to `ux/view/`) and optionally `on:` transitions and `invoke:` service calls. Templates live in `ux/view/login/` subdirectories:

```html
<!-- ux/view/login/idle.html -->
<form ux-event="SUBMIT">
  <input name="email" type="email" required />
  <button type="submit">Login</button>
</form>
```

---

## 3. Understand the build pipeline

The framework is compile-first: YAML views are validated, type-checked, and compiled into TypeScript artifacts before runtime. Invoke the pipeline directly using `ux3`:

```bash
# Development (watch mode + dev server)
ux3 dev

# Full production build
ux3 build

# Type-check and linting
ux3 type-check
ux3 lint
```

The pipeline:
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
ux3 test              # run once
ux3 test --watch      # watch mode
ux3 test:e2e --debug  # Playwright e2e with browser
```

---

## 5. Run the full example

For a production-grade reference implementation, explore `examples/iam`:

```bash
cd examples/iam
ux3 dev
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
