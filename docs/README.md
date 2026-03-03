# Documentation Index

Welcome to the UX3 documentation hub — a user‑centric collection of guides that walk you through every step of building, styling, testing, and deploying applications with the framework. 

UX3 is built around **configuration over code**; the documentation mirrors that philosophy by focusing on how to declare behavior in YAML/JSON and then leverage the compiler and CLI to do the rest.

---

## Quick Navigation

### CLI & Tooling

- **`ux3` CLI reference** — build, compile, validate, and more. See [compilation.md](compilation.md#cli-commands)
- **Configuration files** — `ux3.config.json` and schema directories define project defaults.

### Core Concepts

- **[FSM Core](fsm-core.md)** — State machine architecture and usage
- **[Reactive State](reactive-state.md)** — Signal-based reactivity
- **[View Components](view-components.md)** — FSM-driven views and rendering
- **[App Context](app-context.md)** — Dependency injection and configuration

### Building & Development

- **[Build & Development](build-and-dev.md)** — Compilation, dev server, testing
- **[Compilation](compilation.md)** — Compiler architecture and pipeline
- **[Validation](validation.md)** — Build-time validation and type safety
- **[Template System](template-system.md)** — HBS template language and compilation

### Styling & Design

- **[Styles](styles.md)** — Token-based styling system
- **[Tokens](tokens.md)** — Design tokens and CSS variables
- **[Parts & Theming](parts-and-theming.md)** — Component parts and theming

### Features & Patterns

- **[Routing](routing.md)** — View routing and navigation
- **[Services](services.md)** — HTTP, WebSocket, JSON-RPC services
- **[i18n](i18n.md)** — Internationalization and translations
- **[Security](security.md)** — XSS prevention and sanitization
- **[Accessibility](accessibility.md)** — WCAG compliance and a11y practices

### Advanced Topics

- **[Form Field](form-field.md)** — Form components and validation
- **[Slots & Templates](slots-and-templates.md)** — Slot patterns and composition
- **[Tailwind Integration](tailwind.md)** — Using Tailwind with UX3
- **[ux-style Directive](ux-style.md)** — Style composition system
- **[Testing Guides](testing-guides.md)** — Unit and E2E testing

### Examples

- **[IAM Example Application](iam-example.md)** — Complete market intelligence app

---

## Architecture Overview

UX3 is a **build-time declarative UI framework** with:

```
YAML + HTML          → Validation    → Code Generation    → TypeScript
────────────            ─────────────    ───────────────    ──────────
View configs        Schema check      ViewComponent      Type-safe
FSM definitions     FSM reachability  FSM config         components
Routes              i18n keys         Route definitions
Services            Guard expressions Style mappings
```

### Key Principles

1. **Configuration-First** — UI is declarative YAML + HTML, not code
2. **Build-Time Complexity** — Push hard problems to compile-time
3. **FSM-Driven** — Views are state machines, not imperative code
4. **Type-Safe** — Full TypeScript types generated from configs
5. **Lightweight** — ~2KB gzipped FSM, zero dependencies
6. **Security-First** — Built-in XSS prevention and sanitization

---

## Getting Started

### 1. Install

```bash
npm install @ux3/ux3
```

### 2. Create View

Create `ux/view/hello.yaml`:

```yaml
initial: idle
states:
  idle:
    template: 'view/hello/idle.html'
    on:
      CLICK: loading
  loading:
    template: 'view/hello/loading.html'
  done:
    template: 'view/hello/done.html'
```

### 3. Create Templates

Create `ux/view/hello/idle.html`:

```html
<button ux-event="CLICK">
  {{ i18n('actions.click-me') }}
</button>
```

### 4. Compile

```bash
npm run build
```

### 5. Use in HTML

```html
<ux-hello ux-fsm="hello" ux-view="hello"></ux-hello>
```

---

## Common Tasks

### Add a New View

1. Create `ux/view/{name}.yaml` with FSM config
2. Create `ux/view/{name}/` directory
3. Add `{state}.html` templates for each state
4. Run `npm run build`
5. Use `<ux-{name}>` in HTML

**See:** [Views](views.md)

### Add a Service

1. Define in `ux/service/services.yaml`
2. Add i18n keys in `ux/i18n/`
3. Use in view invokes
4. Run `npm run build`

**See:** [Services](services.md)

### Add Styling

1. Create `ux/style/{component}.yaml`
2. Reference tokens from `ux/token/`
3. Use `ux-style` in templates
4. Run `npm run build`

**See:** [Styles](styles.md)

### Add Translations

1. Add key to `ux/i18n/en.json`
2. Add translations to other locales
3. Use in templates: `{{ i18n('key.path') }}`
4. Run `npm run build` (validates keys)

**See:** [i18n](i18n.md)

### Write Tests

1. Test FSM transitions
2. Test service calls
3. Test template rendering
4. E2E test with Playwright

**See:** [Testing Guides](testing-guides.md)

---

## Framework Modules

### @ux3/fsm

Finite state machine:

```typescript
import { StateMachine, FSMRegistry } from '@ux3/fsm';

const fsm = new StateMachine({ /* config */ });
FSMRegistry.register('auth', fsm);
```

**API:** [FSM Core](fsm-core.md)

### @ux3/state

Reactive signals:

```typescript
import { reactive, effect } from '@ux3/state';

const state = reactive({ count: 0 });
effect(() => console.log(state.count));
```

**API:** [Reactive State](reactive-state.md)

### @ux3/ui

View components:

```typescript
import { ViewComponent } from '@ux3/ui';
import { AppContextBuilder } from '@ux3/ui/context-builder';

const appContext = new AppContextBuilder(config)
  .withMachines()
  .withServices()
  .build();
```

**API:** [View Components](view-components.md), [App Context](app-context.md)

### @ux3/security

Security & sanitization:

```typescript
import { escapeHtml, sanitizeHtml, sanitizeUrl } from '@ux3/security';

const safe = escapeHtml(userText);
```

**API:** [Security](security.md)

### @ux3/hbs

Template compilation:

```typescript
import { Lexer, Parser, Compiler } from '@ux3/hbs';

const code = new Compiler().compileToCode(ast);
```

**API:** [Template System](template-system.md)

---

## CLI Commands

### Build

```bash
npm run build
# Compile + TypeScript + Minify

npm run dev
# Dev server with HMR

npm run gold
# Full CI pipeline
```

### Validate

```bash
npx ux3 validate --projectDir . --strict
```

### Compile

```bash
npx ux3 compile --views ./ux/view --output ./generated
```

### Test

```bash
npm test           # Unit tests
npm run test:e2e   # E2E tests
npm run test:watch # Watch mode
```

---

## File Structure

```
project/
├─ ux/                    # Configuration
│  ├─ view/              # View definitions
│  ├─ layout/            # Layout templates
│  ├─ style/             # Style compositions
│  ├─ token/             # Design tokens
│  ├─ i18n/              # Translations
│  ├─ route/             # Routing
│  ├─ service/           # Services
│  └─ validate/          # Validation rules
├─ generated/            # Compiled output (auto)
├─ src/                  # Application code
├─ public/               # Static assets
├─ schema/               # JSON schemas
├─ package.json
└─ ux3.config.json
```

**See:** [Build & Development](build-and-dev.md)

---

## Project Examples

### Todo App

Simple todo list with FSM:

```bash
cd examples/kanban
npm install
npm run dev
```

**See:** [examples/kanban/](../examples/kanban/)

### IAM App

Complete market intelligence application:

```bash
cd examples/iam
npm install
npm run dev
```

**See:** [IAM Example Application](iam-example.md)

---

## Best Practices

### Code Organization

- ✓ One view = one YAML + template directory
- ✓ Styles in `ux/style/`, not components
- ✓ Text in `ux/i18n/`, not templates
- ✓ Services declarative, not imperative
- ✓ Generated files never edited

### Validation

- ✓ Run `npm run build` before commit
- ✓ Use `--strict` in CI
- ✓ Fix all warnings, not just errors
- ✓ Check generated code

### Testing

- ✓ Test FSM transitions
- ✓ Test service integration
- ✓ E2E test user flows
- ✓ Accessibility tests

### Security

- ✓ Always escape user text
- ✓ Sanitize external HTML
- ✓ Validate URLs
- ✓ Use CSP headers

---

## FAQ

**Q: Where do I put custom logic?**  
A: FSM invokes and service implementations. Views should be declarative.

**Q: Can I use X library?**  
A: Yes, if it doesn't duplicate UX3 functionality (state, routing, etc).

**Q: How do I handle errors?**  
A: Add `error` state to FSM, handle in invoke error callback.

**Q: Is SSR supported?**  
A: Not currently. UX3 is client-side only.

**Q: Can I customize the compiler?**  
A: Yes, write custom validators and generators.

---

## Contributing

Contributions welcome! Please:

1. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Follow code style (`npm run lint`)
3. Add tests for new features
4. Update documentation
5. Create PR with clear description

---

## Support

- **Issues:** [GitHub Issues](https://github.com/onnx-cloud/ux3/issues)
- **Discussions:** [GitHub Discussions](https://github.com/onnx-cloud/ux3/discussions)
- **Docs:** You're reading them!

---

## License

MIT © UX3 Contributors
