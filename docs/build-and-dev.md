# Build & Development

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# For IAM example specifically
npm run dev:iam

# Watch and recompile on changes
npm run build:watch
```

### Production Build

```bash
# Full production build
npm run build

# With size check
npm run size-check

# With a11y audit
npm run a11y-audit
```

### Testing

```bash
# Unit tests (Vitest)
npm test

# Watch mode
npm test:watch

# E2E tests (Playwright)
npm run test:e2e

# E2E debug UI
npm run test:e2e:debug
```

---

## Compilation Pipeline

UX3 compilation happens in this order:

### 1. Validation

```bash
npx ux3 validate --projectDir ./examples/iam
```

Checks:
- JSON Schema compliance
- FSM reachability
- Template resolution
- i18n completeness
- Service invocation
- Guard expressions
- Accessibility
- Circular dependencies

**Output:**
- ✓ Compilation can proceed
- ✗ Errors must be fixed

### 2. Code Generation

```bash
npx ux3 compile --views ./ux/view --output ./generated
```

Generates:
- `generated/views/` - ViewComponent classes
- `generated/fsm/` - FSM configurations
- `generated/routes.ts` - Route definitions
- `generated/i18n.ts` - i18n bundles
- `generated/styles.ts` - Style mappings
- `generated/config.ts` - Full app config

### 3. TypeScript Compilation

```bash
tsc
```

Compiles generated TypeScript to JavaScript:
- Type checking
- Module bundling
- Output to `dist/`

### 4. Build Verification

```bash
npm run size-check
```

Verifies:
- Bundle size within budget
- No unused dependencies
- Minification successful

---

## Full Build Process

The complete build in CI:

```bash
npm run gold
```

This runs:
1. `npm run lint` - Linting
2. `npm run type-check` - Type checking
3. `npm run build` - Build
4. `npm run test` - Unit tests
5. `npm run test:e2e` - E2E tests
6. `npm run size-check` - Size check
7. `npm run a11y-audit` - Accessibility

---

## Reference

- Package scripts: [package.json](../package.json)
- Compiler: [docs/compilation.md](compilation.md)
- Validation: [docs/validation.md](validation.md)
- Examples: [examples/](../examples/)