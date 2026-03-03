# IAM: Configuration-Driven Market Intelligence App

A comprehensive UX3 application demonstrating compile-first principles, declarative configuration, and production patterns.

## Quick Start

```bash
cd examples/iam
ux3 dev
```

Open [localhost:5173](http://localhost:5173). The inspector panel (bottom-right) shows running FSM states and service calls.

---

## Configuration Deep Dive

UX3 is configuration-first. This app is entirely declared in YAML and HTML templates. No business logic lives in TypeScript; all side-effects, routing, and state machines are declarative.

### Project Configuration (`ux/ux3.yaml`)

The root configuration defines the app's metadata, plugins, and runtime behavior:

```yaml
name: iam                              # App identifier
index: view/index.yaml                 # Entry point view
domain: 'investamerica.money'          # Domain for metadata
site:
  title: "Invest America"
  description: "Your gateway to smart investments."

plugins:                               # Framework extensions
  - name: '@ux3/plugin-tailwind-plus'
    config:
      css: 'https://cdn.tailwindcss.com'
  - name: '@ux3/plugin-charts-js'
  - name: '@ux3/plugin-stripe'
    config:
      apiKey: 'pk_test_12345'

secrets:                               # Injected from environment
  LLM_API_KEY: "{{ env.GROQ_API_KEY }}"

development:                           # Dev-only behavior
  hot-reload: true                     # Auto-reload views on file change
  logging: "debug"                     # Verbose framework logs
  inspector: true                      # Enable on-page inspector

assets:                                # Global scripts/styles
  - type: "script"
    src: "https://cdn.tailwindcss.com"
  - type: "style"
    href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"

runtime:
  bundleKey: "ux3.bundle"              # LocalStorage key
  hydrationFn: "initApp"               # Entry function name
```

**Key pattern**: All settings are declarative. The framework reads this at startup and configures itself; no code changes needed to swap configs.

---

### Service Configuration (`ux/service/services.yaml`)

Services declare how views communicate with external systems. Each service is a transport adapter:

```yaml
services:
  api:                                 # HTTP services
    adapter: http
    baseUrl: http://localhost:1337/api
    auth:
      type: bearer                     # Auto-inject Authorization header

  realtime:                            # WebSocket for live updates
    adapter: websocket
    url: ws://localhost:1337/realtime
    reconnectAttempts: 5
    reconnectInterval: 2000

  chat:                                # JSON-RPC calls
    adapter: jsonrpc
    endpoint: http://localhost:1337/rpc/chat

  eod:                                 # File/static data
    adapter: file
    baseUrl: public/api/asset/eod/{{this.symbol}}.json
    caching:
      enabled: true
      ttl: 86400                       # Cache 24 hours
```

**Usage in views**: Views invoke services by name:

```yaml
states:
  loading:
    invoke:
      service: api
      method: getAsset
    on:
      SUCCESS: loaded
      ERROR: error
```

**Dev pattern**: During development, the dev server mounts `./public` at `/`, so provide dummy JSON files like `public/api/asset/eod/AAPL.json` instead of running a real API.

---

### Routing Configuration (`ux/route/routes.yaml`)

Routes map URL paths to views. Parametric routes are supported:

```yaml
routes:
  - path: /                      # Home
    view: index
  - path: /login
    view: login
  - path: /dashboard/:section    # Parameter: :section
    view: dashboard
  - path: /market/:exchange
    view: market
  - path: /asset/:symbol         # Dynamic routes
    view: asset
  - path: /chat/:conversation
    view: chat
  - path: /blog/:slug
    view: blog
```

**Parameters in views**: Route params are accessible in FSM context:

```yaml
states:
  loaded:
    template: 'asset/detail.html'
    # {{ ctx.params.symbol }} available in template
```

---

### Internationalization (`ux/i18n/`)

i18n strings live separately from code. No hardcoded text in templates or views.

Structure:
```
ux/i18n/
  en/
    common.json          # Shared strings
    dashboard.json       # View-specific strings
    validation.json      # Form errors
```

**Example**: `ux/i18n/en/common.json`:
```json
{
  "nav.home": "Home",
  "nav.login": "Sign In",
  "button.submit": "Submit",
  "error.network": "Network error. Try again."
}
```

**Usage in templates**: Reference keys with `{{ i18n('key') }}`:
```html
<button>{{ i18n('button.submit') }}</button>
```

**Build-time validation**: The compiler verifies all `i18n()` calls reference existing keys. Missing keys fail the build.

---

### Style Configuration (`ux/style/`)

Declarative, scoped styling using `ux-style` attributes. No global CSS classes.

Structure:
```
ux/style/
  primitives/           # Reusable atomic styles
  compositions/         # Composite style patterns
  view/                 # View-specific styles
```

**Example**: `ux/style/primitives/button.yaml`:
```yaml
button-primary:
  base: "px-4 py-2 rounded font-semibold"
  states:
    hover: "bg-blue-600"
    active: "opacity-90"
    disabled: "opacity-50 cursor-not-allowed"
```

**Usage in templates**: Reference styles by name:
```html
<button ux-style="button-primary">Login</button>
```

**Registry pattern**: The framework auto-loads all `ux-style` references at runtime via a centralized style registry. Templates declare what they need; the registry injects the correct CSS.

---

### Token System (`ux/token/`)

Design tokens define colors, spacing, typography, etc. Used by style compositions:

```yaml
# ux/token/colors.yaml
primary: "#0066cc"
success: "#00aa44"
error: "#cc0000"
```

Style compositions reference tokens:
```yaml
# ux/style/compositions/card.yaml
card-success:
  base: "p-4 rounded border-l-4 border-{{ token('success') }}"
```

**Production pattern**: Tokens centralize design decisions for theming and A/B testing.

---

### View State Machines (`ux/view/`)

Each view is a finite-state machine declared in YAML + HTML templates.

**Example**: `ux/view/login.yaml`

```yaml
name: Login
layout: auth
initial: idle
states:
  idle:
    template: 'view/login/idle.html'
    on:
      SUBMIT: validating
  validating:
    template: 'view/login/validating.html'
    invoke:
      service: api
      method: authenticate
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

**Related template**: `ux/view/login/idle.html`

```html
<form ux-event="SUBMIT">
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit" ux-style="button-primary">
    {{ i18n('button.login') }}
  </button>
</form>
```

**Guards & conditions**: State transitions can be conditional:

```yaml
states:
  validating:
    invoke:
      service: api
      method: authenticate
    on:
      SUCCESS:
        target: success
        guard: '{{ ctx.result.verified }}'  # Only if verified
      ERROR: error
```

---

### Validation Rules (`ux/validate/`)

Declarative form validation schemas:

```yaml
# ux/validate/login.yaml
email:
  type: email
  required: true
  message: "{{ i18n('validation.email.invalid') }}"

password:
  type: password
  minLength: 8
  pattern: '^(?=.*[A-Z])(?=.*[0-9])'
  message: "{{ i18n('validation.password.weak') }}"
```

**Compile-time check**: Validator references in templates are verified at build time.

---

## Development & Testing

### Inspector Panel

When `development.inspector: true` in `ux/ux3.yaml`, an overlay panel appears showing:
- Current FSM state
- Running services and their payloads
- Context variables
- Lifecycle events

Click the panel to minimize/show.

### Declarative Scenarios (`tests/decl/`)

Tests are written as YAML scenario flows, not code:

```yaml
# tests/decl/login.yaml
scenario: Login Flow
steps:
  - action: navigate
    path: /login
  - action: fillForm
    fields:
      email: user@example.com
      password: SecurePass123
  - action: click
    selector: '[type=submit]'
  - action: expectState
    view: login
    state: success
```

These drive both Playwright e2e tests and serve as living documentation.

### Type Safety

The compiler generates TypeScript types in `generated/`:

```ts
// generated/ux/view/login.ts
export interface LoginFSM {
  name: 'Login';
  initialState: 'idle';
  states: {
    idle: { /* ... */ };
    validating: { /* ... */ };
    // ...
  };
}
```

Tests import these to catch misconfigurations early.

---

## Production Patterns

- **Single source of truth**: Configuration lives in YAML; no duplication in code.
- **Build-time validation**: Missing i18n keys, broken route refs, undefined services → build fails.
- **Declarative services**: Side-effects are declared, not hardcoded.
- **Scoped styles**: No global CSS; each template declares its styles.
- **Dev/prod parity**: `ux/ux3.yaml` has a `development` section; production configs can be swapped via environment variables.
- **Caching strategies**: Services declare cache rules (TTL, invalidation) at config time.

---

## Key Files

| Path | Purpose |
|------|---------|
| `ux/ux3.yaml` | Project metadata, plugins, dev settings |
| `ux/service/services.yaml` | Service adapters & endpoints |
| `ux/route/routes.yaml` | URL-to-view mapping |
| `ux/i18n/en/` | Internationalization strings |
| `ux/style/` | Declarative style system |
| `ux/token/` | Design tokens |
| `ux/view/` | FSM view definitions |
| `ux/validate/` | Form validation schemas |
| `ux/layout/` | Reusable page layouts |
| `tests/decl/` | Scenario-driven tests |
| `tests/e2e/` | Playwright e2e tests |

---

## Learn More

- [FSM Core Concepts](../../docs/fsm-core.md)
- [Services & Side-Effects](../../docs/services.md)
- [View System](../../docs/views.md)
- [Styling & Tokens](../../docs/tokens.md)
- [i18n Integration](../../docs/i18n.md)
- [Testing Guides](../../docs/testing-guides.md)
