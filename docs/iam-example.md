# IAM Example Application

## Overview

The IAM (Invest America Money) example is a complete market intelligence application demonstrating UX3 best practices. It shows:
- Multi-view FSM-driven architecture
- Complex routing and navigation
- Service integration (HTTP, JSON-RPC)
- State machine composition
- i18n and styling
- Production-ready patterns

**Located:** [examples/iam/](../examples/iam/)

---

## Architecture

### Views

| View | Purpose | FSM | States |
|------|---------|-----|--------|
| `login` | Authentication | `auth` | idle, authenticating, authenticated, error |
| `sign-up` | User registration | `signup` | idle, validating, submitting, success, error |
| `dashboard` | Main dashboard | `dashboard` | idle, loading, loaded, error |
| `account` | User account settings | `account` | idle, loading, loaded, editing, saving, error |
| `billing` | Billing & subscription | `billing` | idle, loading, loaded, error |
| `for-you` | Personalized content | `foryou` | idle, loading, loaded, error |
| `chat` | Chat interface | `chat` | idle, loading, connected, error |
| `blog` | Blog reader | `blog` | idle, loading, loaded, error |
| `news` | News feed | `news` | idle, loading, loaded, error |
| `market` | Market data | `market` | idle, loading, loaded, error |
| `macro` | Macro analysis | `macro` | idle, loading, loaded, error |

### Services

```
services/
├─ api (HTTP)
│  ├─ GET /auth/login
│  ├─ GET /data/market
│  ├─ GET /data/portfolio
│  └─ GET /content/news
├─ rpc (JSON-RPC)
│  ├─ chat.send
│  ├─ user.getProfile
│  └─ data.getChart
└─ mock (Development)
   └─ Returns stub data for testing
```

### Routing

```yaml
routes:
  /: { view: 'dashboard' }
  /login: { view: 'login' }
  /signup: { view: 'sign-up' }
  /account: { view: 'account', requireAuth: true }
  /billing: { view: 'billing', requireAuth: true }
  /chat: { view: 'chat', requireAuth: true }
  /market: { view: 'market' }
  /blog: { view: 'blog' }
  /news: { view: 'news' }
```

---

## Project Structure

```
examples/iam/
├─ ux/                      # UX3 configuration
│  ├─ view/                 # View definitions (YAML + HTML)
│  │  ├─ login.yaml
│  │  ├─ dashboard.yaml
│  │  └─ {view-name}/       # Templates per state
│  │     ├─ idle.html
│  │     ├─ loading.html
│  │     └─ loaded.html
│  ├─ layout/               # Layout templates
│  │  ├─ _.html            # Root layout
│  │  ├─ default.html      # Default layout
│  │  └─ auth.html         # Auth flow layout
│  ├─ style/               # Style compositions
│  │  ├─ button.yaml
│  │  ├─ card.yaml
│  │  └─ form.yaml
│  ├─ token/               # Design tokens
│  │  ├─ colors.yaml
│  │  ├─ spacing.yaml
│  │  └─ typography.yaml
│  ├─ i18n/                # Translations
│  │  ├─ en.json
│  │  └─ es.json
│  ├─ route/               # Routing config
│  │  └─ routes.yaml
│  ├─ service/             # Service definitions
│  │  └─ services.yaml
│  └─ ux3.yaml             # App configuration
├─ generated/              # Compiled output (auto-generated)
│  ├─ views/
│  ├─ fsm/
│  ├─ routes.ts
│  ├─ i18n.ts
│  ├─ styles.ts
│  └─ config.ts
├─ src/                    # Application code
│  ├─ index.ts            # Minimal bootstrap entrypoint (uses @ux3/ui/bootstrap)
│  ├─ services/           # Service implementations
│  │  └─ index.mjs        # Stub implementations
│  └─ utils/              # Utilities
├─ public/                 # Static assets
│  └─ styles/
├─ index.html              # Entry HTML
├─ package.json

> **Note:** `examples/iam/app.ts` is retained only for backwards compatibility
> and emits a deprecation warning. New projects should use `src/index.ts`
> which imports the built-in bootstrap helper.
└─ README.md
```

---

## Key Features

### 1. Authentication Flow

```yaml
# ux/view/login.yaml
initial: idle
states:
  idle:
    template: 'view/login/idle.html'
    on:
      SUBMIT: authenticating
  authenticating:
    template: 'view/login/authenticating.html'
    invoke:
      src: submitLogin
      input: { email: 'this.email', password: 'this.password' }
    on:
      SUCCESS: authenticated
      FAILURE: error
  authenticated:
    template: 'view/login/authenticated.html'
  error:
    template: 'view/login/error.html'
    on:
      RETRY: idle
```

### 2. Data Loading

Views automatically load data via invokes:

```yaml
dashboard:
  on:
    LOAD: loading
  loading:
    invoke:
      src: loadDashboard
      input: { userId: 'this.userId' }
    on:
      SUCCESS: loaded
      ERROR: error
```

### 3. Service Integration

Services fetch data for views:

```typescript
// ux/service/services.yaml
api:
  type: http
  config:
    baseURL: https://api.investamerica.money
    headers:
      Authorization: 'Bearer ${AUTH_TOKEN}'

rpc:
  type: jsonrpc
  config:
    url: https://api.investamerica.money/rpc
    methods:
      - chat.send
      - user.getProfile
```

Services are used in invokes:

```yaml
invoke:
  src: api  # Uses api service
  method: GET /data/market
```

### 4. i18n

All user-visible text is in `ux/i18n/`:

```json
{
  "home": {
    "title": "Dashboard",
    "welcome": "Welcome, {{name}}"
  },
  "auth": {
    "login": "Login",
    "password": "Password",
    "errors": {
      "invalid-email": "Invalid email address",
      "password-required": "Password is required"
    }
  },
  "actions": {
    "submit": "Submit",
    "cancel": "Cancel"
  }
}
```

Used in templates:

```html
<h1>{{ i18n('home.title') }}</h1>
<button>{{ i18n('actions.submit') }}</button>
```

### 5. Styling

Styles use tokens and compositions:

```yaml
# ux/token/colors.yaml
primary: '#0066CC'
surface: '#FFFFFF'
text: '#333333'
error: '#DC3545'

# ux/style/button.yaml
btn-primary:
  base: 'px-4 py-2 rounded'
  color: '$primary'
  text: 'white'
  hover: 'opacity-90'
```

Used via `ux-style`:

```html
<button ux-style="btn-primary">Submit</button>
```

---

## Running IAM

### Development

```bash
cd examples/iam
npm install
npm run dev

# Open http://localhost:5173
```

### Production

```bash
npm run build
npm run preview

# Or deploy dist/
```

---

## Development Notes

### Service Stubs

Service implementations in `ux/service/index.mjs` are **stubs for development**:

```javascript
// ux/service/index.mjs
export async function loadDashboard() {
  // Stub - replace with real API in production
  return {
    widgets: [
      { id: 1, title: 'Portfolio', data: [] }
    ]
  };
}
```

**For production:**
1. Replace stubs with real API calls
2. Use environment variables for API URLs
3. Implement authentication properly
4. Add error handling and retries

### Styling System

Current styles use simple Tailwind-like classes:

```html
<div class="px-4 py-2 rounded bg-blue-500">Content</div>
```

**For production:**
1. Migrate to design tokens in `ux/token/`
2. Create style compositions in `ux/style/`
3. Use CSS variables for theming
4. Implement dark mode support

### Missing i18n Keys

The compiler validates i18n keys at build time:

```bash
npm run build
# [WARNING] Missing i18n key: 'auth.forgot-password'
```

**Fix:**
1. Add key to `ux/i18n/en.json`
2. Add translations to other locales
3. Re-run build

---

## Testing

### Unit Tests

```bash
npm test
```

Tests validate:
- FSM transitions
- Service calls
- Form validation
- Routing logic

### E2E Tests

```bash
npm run test:e2e
```

Playwright tests:
- Login flow
- Dashboard rendering
- Data loading
- Navigation

---

## Troubleshooting

### Build Fails with Template Errors

Ensure all templates exist:

```bash
# Check template files
ls ux/view/*/

# Should have matching .html files for each state
```

### Services Not Working

Check service configuration:

```yaml
# ux/service/services.yaml - verify baseURL and methods
api:
  type: http
  config:
    baseURL: https://api.investamerica.money
```

### Styling Not Applied

Verify ux-style directive:

```html
<!-- ✓ Correct -->
<button ux-style="btn-primary">Submit</button>

<!-- ✗ Wrong -->
<button class="btn-primary">Submit</button>
```

---

## Contributing

When modifying IAM:

1. **Update source files** in `ux/`
2. **Run `npm run build`** to compile
3. **Check generated files** in `generated/`
4. **Run tests:** `npm test && npm run test:e2e`
5. **Create PR** with changes

**Note:** Do NOT edit files in `generated/` directly

---

## Reference

- IAM App: [examples/iam/](../examples/iam/)
- Views: [examples/iam/ux/view/](../examples/iam/ux/view/)
- Services: [examples/iam/ux/service/](../examples/iam/ux/service/)
- README: [examples/iam/README.md](../examples/iam/README.md)
