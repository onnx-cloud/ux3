# Validation & Type Safety

## Overview

UX3 validates at build-time to catch errors before they reach production:
- JSON Schema validation for all YAML configs
- Type checking for generated code
- Runtime guards for edge cases
- Security validation (XSS, dangerous patterns)
- Accessibility checks

**Goal:** Maximum type safety with zero runtime overhead.

---

## Build-Time Validation

### 1. JSON Schema Validation

Every YAML file is validated against its schema using AJV:

```bash
npx ux3 validate --projectDir ./examples/iam
```

**Validated:**
- View configurations
- FSM definitions
- Route definitions
- Service configurations
- i18n structures
- Style definitions
- Token definitions

**Example error:**

```
[ERROR] ux/view/login.yaml
  - Missing required field: "initial"
  - "submitting" state references undefined target "unknown"
  - Suggestion: Define "unknown" state or use valid target
```

### 2. Advanced Validators

#### FSM Reachability

Ensures all states are reachable from initial state:

```typescript
import { FSMReachabilityValidator } from '@ux3/build/validators';

const validator = new FSMReachabilityValidator();
const errors = validator.validate({
  initial: 'idle',
  states: {
    idle: { on: { GO: 'loading' } },
    loading: { on: { OK: 'done' } },
    orphan: {}  // ⚠️ Unreachable
  }
});
```

#### Template Reference Validation

Verifies all template paths exist:

```typescript
import { TemplateRefsValidator } from '@ux3/build/validators';

const validator = new TemplateRefsValidator();
const errors = validator.validate({
  views: { login: { template: 'view/login.html' } }
});
```

#### Guard Expression Validation

Parses and validates guard conditions:

```typescript
import { GuardExpressionsValidator } from '@ux3/build/validators';

const validator = new GuardExpressionsValidator();

// ✓ Valid
const valid = validator.validate('(ctx) => ctx.count > 0');

// ✗ Invalid syntax
const invalid = validator.validate('ctx.count > invalid syntax');
```

#### i18n Completeness

Checks all i18n keys used are defined:

```typescript
import { I18nValidator } from '@ux3/build/validators';

const validator = new I18nValidator();
const errors = validator.validate({
  templates: ['<p>{{ i18n("missing.key") }}</p>'],
  i18n: { en: { 'existing.key': 'Value' } }
});
```

#### Circular Dependencies

Detects circular imports and service dependencies:

```typescript
import { CircularDepValidator } from '@ux3/build/validators';

const validator = new CircularDepValidator();
// Service A calls Service B, Service B calls Service A
const errors = validator.validate(/* ... */);
```

#### Accessibility Validation

Checks for common a11y issues:

```typescript
import { AccessibilityValidator } from '@ux3/build/validators';

const validator = new AccessibilityValidator();
const errors = validator.validate({
  templates: [
    '<button>Submit</button>',  // ✓ Has text
    '<img src="photo.jpg" />',  // ✗ Missing alt
    '<input />'                 // ✗ Missing label
  ]
});
```

---

## Type Generation

Generated TypeScript provides full type safety:

### FSM Types

```typescript
// generated/fsm/types.ts

export type AuthFsmState = 'idle' | 'authenticating' | 'authenticated' | 'error';

export interface AuthFsmContext {
  user: { id: number; name: string } | null;
  error: string | null;
  attempts: number;
}

export type AuthFsmEvent = 
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'SUCCESS'; user: AuthFsmContext['user'] }
  | { type: 'FAILURE'; error: string }
  | { type: 'LOGOUT' };
```

### View Types

```typescript
// generated/views/login.ts

export class LoginView extends ViewComponent {
  // FSM config is type-safe
  static FSM_CONFIG: StateConfig<AuthFsmContext> = { /* ... */ };
}
```

### i18n Types

```typescript
// generated/i18n.ts

export type i18nKey =
  | 'home.title'
  | 'home.greeting'
  | 'auth.login'
  | 'auth.password-required'
  | 'actions.submit'
  | 'actions.cancel';

export function i18n(key: i18nKey): string;
export function i18n(key: i18nKey, vars: Record<string, any>): string;
```

---

## Runtime Validation

### FormValidator

Validates form data at runtime:

```typescript
import { FormValidator } from '@ux3/validation';

const validator = new FormValidator({
  email: { type: 'string', format: 'email', required: true },
  password: { type: 'string', minLength: 8, required: true },
  remember: { type: 'boolean' }
});

const data = {
  email: 'user@example.com',
  password: 'secure123',
  remember: true
};

const result = validator.validate(data);
if (!result.valid) {
  console.error(result.errors);
  // { email: [], password: [], remember: [] }
}
```

### GuardValidator

Validates guard conditions:

```typescript
import { GuardValidator } from '@ux3/build/validators';

const validator = new GuardValidator();

// Parse and validate expression
const isValid = validator.isValidExpression('(ctx) => ctx.count > 0');
```

---

## Error Severity Levels

### Error

Build fails, deployment blocked:

```
[ERROR] ux/view/login.yaml - Missing required field "initial"
```

### Warning

Build succeeds, but issues should be addressed:

```
[WARNING] ux/view/login.yaml - Unused state "orphan"
```

**Promote warnings to errors:**

```bash
npx ux3 build --strict
```

### Info

Informational messages:

```
[INFO] Compiled 12 views, 3 services, 45 i18n keys
```

---

## Validation Config

Configure which validators run:

```json
{
  "validation": {
    "enableAdvancedValidation": true,
    "failOnWarnings": false,
    "validators": {
      "schema": true,
      "fsm-reachability": true,
      "template-refs": true,
      "i18n-completeness": true,
      "guard-expressions": true,
      "circular-deps": true,
      "accessibility": true,
      "security": true
    }
  }
}
```

---

## Custom Validators

Extend validation for project-specific rules:

```typescript
import { CustomRuleValidator } from '@ux3/build/validators';

class MyValidator extends CustomRuleValidator {
  validate(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Custom rule: all views must have error state
    for (const [name, view] of Object.entries(config.views || {})) {
      if (!view.states?.error) {
        errors.push({
          file: `ux/view/${name}.yaml`,
          message: `View must have an "error" state`,
          severity: 'warning'
        });
      }
    }
    
    return errors;
  }
}

// Register in validator
const validator = new Validator({ /* ... */ });
validator.registerCustom(new MyValidator());
```

---

## Type-Safe FSM Usage

Leverage generated types:

```typescript
import type { AuthFsmContext, AuthFsmEvent, AuthFsmState } from './generated/fsm/types';
import { StateMachine } from '@ux3/fsm';

const authFsm = new StateMachine<AuthFsmContext>({
  id: 'auth',
  initial: 'idle',
  states: { /* ... */ }
});

// Type-safe event sending
authFsm.send<AuthFsmEvent>({
  type: 'LOGIN',
  email: 'user@example.com',
  password: 'password'
});

// Type-safe context access
const context = authFsm.getContext() as AuthFsmContext;
console.log(context.user?.name);  // Type-checked!
```

---

## Type-Safe Routing

Router types are generated:

```typescript
import type { Route } from './generated/routes';

const routes: Route[] = [
  { path: '/', view: 'home' },       // ✓ Valid view
  { path: '/login', view: 'unknown' } // ✗ TypeScript error
];
```

---

## Best Practices

1. **Run validation in CI** — Catch errors before merge
2. **Use `--strict` mode** — Treat warnings as errors
3. **Check generated types** — Import from generated/ for type safety
4. **Test validators** — Verify custom validators work
5. **Review error messages** — Implement clearer diagnostics

---

## Troubleshooting

### "Unknown validation error"

Enable debug mode:

```bash
npx ux3 validate --projectDir . --debug
```

### "False positive warning"

Disable specific validator:

```bash
npx ux3 validate --projectDir . --skip-accessibility
```

### "Type mismatch at runtime"

Check generated types match actual data:

```typescript
// Ensure context type matches FSM
const fsm = new StateMachine<AuthFsmContext>({ /* ... */ });

// Get context with correct type
const ctx = fsm.getContext() as AuthFsmContext;
```

---

## Reference

- Validators: [src/build/validators/](src/build/validators/)
- Validator core: [src/build/validator.ts](src/build/validator.ts)
- Type generation: [src/build/type-generator.ts](src/build/type-generator.ts)
- Validation docs: [docs/validation.md](docs/validation.md)
