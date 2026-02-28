# Build & Compilation — Compiler Architecture

## Overview

The UX3 build system compiles declarative YAML configurations into generated TypeScript code. It's a build-time system that produces:
- View components from YAML + HTML
- Type-safe FSM configs
- Route definitions
- i18n bundles
- Style mappings

**Philosophy:** Complexity moves to build-time, reducing runtime overhead.

---

## Build Pipeline

```
1. Configuration Discovery
   └─ Read all YAML files from ux/

2. Validation
   ├─ JSON Schema validation (AJV)
   ├─ Advanced validators
   │  ├─ FSM reachability
   │  ├─ Route references
   │  ├─ i18n completeness
   │  ├─ Template resolution
   │  ├─ Service invokes
   │  └─ Guard expressions
   └─ Report errors/warnings

3. Compilation
   ├─ View compilation
   │  ├─ Load YAML + HTML templates
   │  ├─ Extract bindings
   │  ├─ Generate ViewComponent classes
   │  └─ Export view registry
   ├─ FSM config generation
   ├─ Route generation
   ├─ i18n aggregation
   └─ Style compilation

4. Code Generation
   └─ Emit TypeScript files to generated/
```

---

## View Compiler

Converts `ux/view/*.yaml` + HTML templates into ViewComponent classes.

### Input

```yaml
# ux/view/login.yaml
initial: idle
states:
  idle:
    template: 'view/login/idle.html'
    on:
      SUBMIT: submitting
  submitting:
    template: 'view/login/submitting.html'
    invoke:
      src: submitLogin
```

```html
<!-- ux/view/login/idle.html -->
<form ux-event="SUBMIT">
  <input type="email" />
  <button>Login</button>
</form>
```

### Output

```typescript
// generated/views/login.ts
export class LoginView extends ViewComponent {
  static FSM_CONFIG = {
    id: 'login',
    initial: 'idle',
    states: { /* ... */ }
  };

  protected layout = '...';
  protected templates = new Map([
    ['idle', '<form>...</form>'],
    ['submitting', '<div>Loading...</div>']
  ]);

  protected bindings = {
    events: [
      { element: 'form', event: 'submit', action: 'SUBMIT' }
    ],
    reactive: [],
    i18n: [],
    widgets: []
  };
}

customElements.define('ux-login', LoginView);
```

### Compilation Steps

1. **Load YAML** → Parse view config
2. **Resolve templates** → Load HTML files
3. **Extract bindings** → Scan templates for directives
   - `ux-event` → Event bindings
   - `ux-if` → Reactive conditions
   - `ux-repeat` → List bindings
   - `ux-style` → Style references
4. **Generate component** → Create TypeScript class
5. **Export registry** → Create index.ts with all views

---

## Validator

Runs multiple validation passes to catch errors at build-time.

### JSON Schema Validation

Uses AJV to validate YAML against schemas:

```typescript
// Validates against schema/view.schema.json
const valid = ajv.validate('view-schema', viewYaml);

if (!valid) {
  console.error('Invalid view:', ajv.errorsText());
}
```

**Checked:**
- Required fields present
- Field types correct
- Enum values valid
- String formats (URLs, patterns)

### Advanced Validators

#### FSM Reachability

Ensures all states are reachable from initial state:

```yaml
initial: idle
states:
  idle:
    on: { GO: loading }
  loading:
    on: { OK: done }
  done:
    on: {}
  unreachable:  # ⚠️ WARNING - Never reached from idle
    on: {}
```

#### Template Resolution

Verifies all template paths exist:

```yaml
states:
  idle:
    template: 'view/login/idle.html'  # ✓ Exists
  missing:
    template: 'view/login/missing.html'  # ✗ Not found
```

#### i18n Completeness

Checks all i18n keys used in templates are defined:

```html
<!-- Uses i18n key -->
<p>{{ i18n('auth.title') }}</p>
```

```json
{
  "en": {
    "auth": {
      "title": "Login"  // ✓ Defined
    }
  }
}
```

#### Guard Expressions

Validates guard condition syntax:

```yaml
on:
  PROCEED:
    target: processing
    guard: (ctx) => ctx.canProceed === true  # ✓ Valid JS
```

#### Service Invokes

Checks invoked services exist and have correct method:

```yaml
invoke:
  src: loadUser  # ✓ Service must exist
  input: { id: 'this.userId' }
```

### Running Validation

```bash
# In build step
npx ux3 build

# Or standalone
npx ux3 validate --projectDir ./examples/iam --strict
```

---

## CLI Commands

### ux3 build

Full build pipeline:

```bash
npx ux3 build
# Runs: validate → compile → emit code
```

Options:
- `--projectDir` — Project root
- `--output` — Output directory
- `--strict` — Fail on warnings

### ux3 compile

Compile only (skip validation):

```bash
npx ux3 compile --views ./ux/view --output ./generated
```

Options:
- `--views` — View source directory
- `--output` — Output directory
- `--config` — Config file

### ux3 validate

Validate only:

```bash
npx ux3 validate --projectDir .
```

Options:
- `--projectDir` — Project root
- `--strict` — Fail on warnings
- `--detailed` — Show detailed diagnostics

---

## Configuration Files

### ux3.config.json

Project-level configuration:

```json
{
  "projectDir": "./examples/iam",
  "viewsDir": "./ux/view",
  "outputDir": "./generated",
  "schemasDir": "./schema",
  "enableAdvancedValidation": true,
  "failOnWarnings": false,
  "environments": {
    "dev": { "api": "http://localhost:3000" },
    "prod": { "api": "https://api.example.com" }
  }
}
```

### schema/*.schema.json

JSON Schema files for validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "View Configuration",
  "type": "object",
  "properties": {
    "initial": { "type": "string" },
    "states": { "type": "object" },
    "context": { "type": "object" }
  },
  "required": ["initial", "states"]
}
```

---

## Generated Output

### generated/views/

View component classes:

```
generated/views/
├─ login.ts
├─ dashboard.ts
├─ account.ts
└─ index.ts
```

### generated/fsm/

FSM configuration:

```
generated/fsm/
├─ machines.ts
├─ types.ts
└─ context.ts
```

### generated/routes.ts

Route definitions:

```typescript
export const routes = [
  { path: '/', view: 'home' },
  { path: '/login', view: 'login' },
  { path: '/dashboard', view: 'dashboard' }
];
```

### generated/i18n.ts

i18n bundles and types:

```typescript
export const i18n = {
  en: {
    'home.title': 'Home',
    'auth.login': 'Login'
  }
};

export type i18nKey = 'home.title' | 'auth.login';
```

### generated/styles.ts

Style mappings:

```typescript
export const styles = {
  'btn-primary': 'px-4 py-2 bg-blue text-white rounded',
  'card': 'border rounded-lg shadow'
};
```

---

## Integration with TypeScript

Generated code is fully typed:

```typescript
import type { LoginView } from '@ux3/views';
import type { i18nKey } from '@ux3/i18n';
import { routes } from '@ux3/routes';

// Type-safe component usage
const loginView: typeof LoginView = /* ... */;

// Type-safe i18n keys
const key: i18nKey = 'auth.login';  // ✓ Valid
const bad: i18nKey = 'invalid.key';  // ✗ TypeScript error
```

---

## Watch Mode

For development, use watch mode:

```bash
npm run dev
# Recompiles on YAML/HTML changes
```

Or manually:

```bash
npx ux3 compile --watch
```

---

## Troubleshooting

### "Template not found"

Template file doesn't exist at specified path:

```yaml
states:
  idle:
    template: 'view/login/idle.html'  # Check file exists
```

**Fix:** Create the file or correct the path

### "FSM state unreachable"

State has no incoming transitions:

```yaml
states:
  idle: { on: { GO: loading } }
  loading: { on: {} }
  orphan: { on: {} }  # ⚠️ No path from idle
```

**Fix:** Add transition to unreachable state or remove it

### "i18n key not found"

Template uses key that's not defined:

```html
<p>{{ i18n('auth.unknown-key') }}</p>
```

**Fix:** Add key to `ux/i18n/en.json` or use existing key

### "Service not found"

Invoke references non-existent service:

```yaml
invoke:
  src: unknownService  # ✗ Not defined
```

**Fix:** Define service in `services.yaml` or correct name

---

## Best Practices

1. **Run build before deploy** — Catch errors early
2. **Check generated code** — Understand what compiler produces
3. **Use strict mode in CI** — `--strict` flag prevents warnings
4. **Test generated components** — Use real generated code in tests
5. **Version schema files** — Keep schemas in git

---

## Reference

- View Compiler: [src/build/view-compiler.ts](src/build/view-compiler.ts)
- Validator: [src/build/validator.ts](src/build/validator.ts)
- CLI: [src/cli/compile.ts](src/cli/compile.ts)
- Schemas: [schema/](schema/)
- Example: [examples/iam/](examples/iam/)
