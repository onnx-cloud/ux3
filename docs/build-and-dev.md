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

**ConfigGenerator generates `config.ts` with:**
- Routes (from `ux/route/routes.yaml`)
- Services (from `ux/service/*.yaml`)
- Machines (from view FSM configs)
- i18n bundles (from `ux/i18n/`)
- Styles (from `ux/style/`)
- **Templates** (view + layout templates)

**Layout Loading:**
HTML files in `ux/layout/` are automatically loaded and registered as templates:

```
ux/layout/default.html  → config.templates["default"]
ux/layout/auth.html     → config.templates["auth"]
```

Views reference these layouts by name in their FSM configuration.

Generates:
- `generated/views/` - ViewComponent classes
- `generated/fsm/` - FSM configurations
- `generated/routes.ts` - Route definitions
- `generated/i18n.ts` - i18n bundles
- `generated/styles.ts` - Style mappings
- `generated/config.ts` - Full app config

---

## Development Server

The dev server provides hot reload and asset injection:

```bash
npm run dev
# or for a specific example
npm run dev:iam
```

**Features:**
- Hot reload on YAML/template changes
- View compilation on every build
- Layout template loading (no manual config)
- Asset injection (CSS, JS)
- Dev dashboard at `http://localhost:3000/$`
- Source map support
- HMR (Hot Module Replacement)

**Build Order in Dev Mode:**
1. Generate config (including layout loading)
2. Compile views (YAML → TypeScript)
3. Validate configuration
4. Resolve service invocations
5. Bundle application
6. Inject assets (hydration script only)

---

## Asset Injection

The dev server and build system inject scripts and styles into the HTML page:

### Styles

Compiled styles are injected into `<head>`:

```html
<link rel="stylesheet" href="/dist/tokens.css" data-ux3="styles">
<link rel="stylesheet" href="/dist/bundle.css" data-ux3="styles">
```

### Scripts - Hydration Pattern

The recommended pattern uses a single hydration script that initializes the app when the DOM is ready:

```html
<script data-ux3="hydration">
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const m = await import('/dist/bundle.js?ts=1234567890');
      if (m && typeof m.initApp === 'function') {
        await m.initApp();
      }
    } catch(e) {
      console.error('[UX3 hydration]', e);
    }
  });
</script>
```

**Benefits:**
- Single bundle import (no double-loading)
- Waits for DOM to be ready
- Clear initialization point
- Works with dev-server hot reload
- Cache-busting via timestamp query parameter

---

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