# UX3 Strategic Plan — DRY, Declarative, FSM-Guarded

**The problem we're solving:** Today, building a "wide and deep" application (many views, complex state management, composable widgets) still requires hand-wiring. We want **zero manual wiring**—the entire application surface should emerge from configuration.

**The opportunity:** By treating configuration as the source of truth and building a smart compiler that synthesizes TypeScript from specs, we eliminate entire classes of bugs:
- Broken service invokes → validated at compile time
- Missing i18n keys → caught before build
- Unreachable FSM states → detected in schema validation
- Circular dependencies → analyzed statically
- Type mismatches → enforced across services, views, and state

**Our north star:** An IAM-scale app that compiles cleanly, ships performantly, and is fully type-safe from URL to database.

---

## 1. Declarative Architecture (The Source of Truth)

All application logic lives in YAML/JSON specs under `ux/`:

```
ux/
├── route/routes.yaml              # URL surface: path → view + initial state
├── view/*.yaml                    # FSM definitions + state→template mapping
├── view/**/*.html                 # Templates for each FSM state
├── layout/*.html                  # Page structure (header, nav, content, footer)
├── service/*.yaml                 # Service definitions (HTTP, WS, JSONRPC)
├── i18n/[lang]/*.json             # Translations (nested by module)
├── token/*.yaml                   # Design tokens (colors, spacing, typography)
├── style/*.yaml                   # Named style sets (compositions)
└── validate/*.yaml                # Validation rules (schemas, guards)
```

**Key principle: One file, one responsibility.**
- A view YAML defines the FSM state graph and template mappings.
- A service YAML defines how to communicate (protocol, auth, pagination).
- A validation YAML defines constraints on user input (rules, error messages).
- A route YAML defines URL surface and initial context.

---

## 2. The Compilation Pipeline

The compiler is **the framework**. It transforms specs → executable TypeScript:

### Phase 1: Parse & Validate (Compile-Time Safety)
1. **Load all YAML specs** from `ux/` into memory.
2. **Schema validation** against `schema/*.schema.json`:
   - Routes must reference existing views.
   - Service invokes must be resolvable (defined, callable).
   - FSM transitions must target valid states.
   - i18n keys used in templates must exist in all language files.
   - Template refs must exist.
3. **Advanced checks** (optional, can fail CI):
   - No circular service dependencies.
   - All accessible states are reachable from `initial`.
   - Guards are safe (no side effects).
   - No inline styles/hard-coded strings in templates.
4. **Output: Diagnostic report** (errors, warnings, suggestions).

### Phase 2: Code Generation
1. **FSM Configs** → `generated/fsm/*.ts`
   - Convert view YAML → `StateConfig<T>` objects
   - Inject service invokes with type-safe signatures
   - Pre-bind guards and actions

2. **View Components** → `generated/views/*.ts`
   - Template extraction and binding analysis
   - Event delegation setup (ux-on:*)
   - Reactive binding setup ({{signal}})
   - i18n binding setup ({{i18n.key}})
   - Shadow DOM CSS injection (scoped to view)

3. **Service Registry** → `generated/services.ts`
   - HTTP client instances with base URLs and auth
   - WebSocket connectors with reconnect logic
   - JSON-RPC stub generators
   - Service function signatures (TypeScript)

4. **i18n Registry** → `generated/i18n.ts`
   - Nested translation maps, one per language
   - Type-safe key lookup functions
   - Fallback chaining (en-US → en → default)

5. **Token Registry** → `generated/tokens.ts`
   - CSS custom properties (--ux-color-primary, etc.)
   - TypeScript token constants
   - Theme switching hooks

6. **Routes & Manifest** → `generated/routes.ts` + `manifest.json`
   - Route matcher functions
   - Initial FSM state per route
   - Code-split hints
   - Performance budget definitions

7. **Validation Schemas** → `generated/validators.ts`
   - JSONSchema to TypeScript validator compilers
   - Error message mappings (i18n-aware)
   - Type guards for user input

8. **Config Entrypoint** → `generated/config.ts`
   - Export all the above; used by `AppContextBuilder`

### Phase 3: Runtime Initialization
1. **AppContextBuilder**
   - Reads `generated/config.ts`
   - Instantiates FSMRegistry with all machines
   - Instantiates ServiceContainer with all clients
   - Mounts WidgetFactory with lazy-load hints
   - Sets up Router with guards and redirects
   - Initializes i18n provider with active language

2. **Bootstrap**
   - Create `AppContext` from builder
   - Mount root view to DOM
   - Hydrate initial route's FSM
   - Start listening to URL changes

---

## 3. Core Abstraction: FSM as the Spine

**Everything flows through the FSM.**

Each view owns one FSM. That FSM:
- **Defines state graph**: states, transitions, conditions
- **Guards transitions**: `canEnter(state)` checks before allowing entry
- **Triggers side-effects**: `invoke` (service calls, navigation, logs)
- **Emits events**: for telemetry, debugging, perf tracking

Example: IAM `account` view FSM

```yaml
name: account
initial: loading
states:
  loading:
    template: view/account/loading.html
    invoke:
      src: loadAccount    # ← Compiled to ServiceRegistry.loadAccount()
      input: { id: "{{ route.params.id }}" }
    on:
      SUCCESS: viewing    # ← Guarded transition
      ERROR: error
  
  viewing:
    template: view/account/viewing.html
    on:
      EDIT: editing
  
  editing:
    template: view/account/editing.html
    on:
      SAVE: saving
      CANCEL: viewing
  
  saving:
    invoke:
      src: saveAccount
      input: { id: "{{ route.params.id }}", data: "{{ form.data }}" }
    on:
      SUCCESS: viewing
      ERROR: editing
  
  error:
    template: view/account/error.html
    on:
      RETRY: loading
```

**Why FSM is the spine:**
1. **Declarative control flow**: No imperative `if` statements. Transitions are explicit.
2. **Service orchestration**: `invoke` is the *only* way to trigger async work. No dangling promises.
3. **Guarding**: Before entering a state, we can check preconditions (auth, permissions, data availability).
4. **Context isolation**: Each view's FSM owns its context; no leakage to other views.
5. **Observability**: Every transition is a structured event; telemetry is automatic.

---

## 3.5 FSM Unification: Services & Layouts Are Special Views

**Insight:** Services and layouts are not exceptional; they are FSM-driven entities with a **canonical minimal event set**.

### Services Have FSMs
Every service (HTTP, WebSocket, JSON-RPC) has a lifecycle FSM with canonical states and events:

```yaml
# Implicit FSM for any service (auto-generated from service YAML)
states:
  idle:
    on:
      READ: loading    # Transition when a method is invoked
  
  loading:
    invoke:
      src: serviceMethod    # The actual service call
    on:
      SUCCESS: idle        # Return to idle after success
      ERROR: idle          # Return to idle after error (with retry available)
      TIMEOUT: idle        # Handle timeout
  
  # Canonical events (all services share these):
  # - CALL (method invoked)
  # - SUCCESS (result received)
  # - ERROR (error occurred)
  # - TIMEOUT (exceeded timeout threshold)
  # - RETRY (user or system requests retry)
```

**Benefits:**
- Service calls are **observable**: each call emits structured FSM events (call started, succeeded, failed, retried)
- Service calls are **guarded**: can reject a call if preconditions aren't met (rate limit exceeded, offline, auth expired)
- Service calls are **queryable**: "what's the current state of this service call?" (idle, loading, error)
- Service call context is **isolated**: each invocation has its own FSM context (input, output, error, retry count)

**Example: Guarding a service call based on rate limits**
```yaml
# In a view's FSM
invoke:
  src: apiService.searchProducts
  guard: "{{ apiService.remainingQuota > 0 }}"  # Can only call if quota available
  input: { query: "{{ searchBox.value }}" }
on:
  SUCCESS: resultsReady
  ERROR: searchFailed
```

### Layouts Have FSMs
A layout is a **special view** that owns UI state: nav open/closed, theme, sidebar state, user menu visibility, etc.

```yaml
# ux/layout/default.yaml (implicit FSM-driven layout)
name: DefaultLayout
initial: ready

states:
  ready:
    template: layout/default.html
    on:
      TOGGLE_NAV: navOpen
      TOGGLE_THEME: themeChanged
      OPEN_USER_MENU: userMenuOpen

  navOpen:
    template: layout/default-nav-open.html
    on:
      TOGGLE_NAV: ready
      NAVIGATE: ready  # Close nav when user navigates

  userMenuOpen:
    template: layout/default-user-menu-open.html
    on:
      TOGGLE_USER_MENU: ready
      SELECT_ACTION: ready
```

**Benefits:**
- Layout state is **centralized**: nav open/closed, theme, menu visibility are managed by a single FSM
- Layout transitions are **declarative**: template swaps are explicit per state
- Layout changes are **consistent**: all views using the layout see the same nav/menu state
- Layout is **composable**: parent and child layouts can coordinate via guard expressions

**Example: Showing nav only when authenticated**
```yaml
userMenuOpen:
  on:
    SELECT_LOGOUT:
      target: ready
      guard: "{{ auth.isLoggedIn }}"  # Guard against race conditions
```

### Canonical Service Events (All Services Share)
Every service FSM emits these events:

| Event | Meaning | Context |
|-------|---------|---------|
| `CALL` | Service method invoked | Method name, input params |
| `BUSY` | Network request in flight | Request ID, timestamp |
| `SUCCESS` | Response received | Response data, latency |
| `ERROR` | Request failed | Error type, message, retry count |
| `TIMEOUT` | Exceeded timeout threshold | Timeout duration, method |
| `RETRY` | Retry attempt initiated | Retry count, backoff delay |

**Compiler generates:**
```typescript
// Generated from service/api.yaml
type ServiceEvent = 'CALL' | 'BUSY' | 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'RETRY';

// Service FSM context
type ApiServiceFsmContext = {
  currentMethod?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: Error;
  retryCount: number;
  latency?: number;
  timeout: number;
};
```

### Why This Unification Matters

1. **Single mental model:** All stateful things (views, services, layouts) are FSMs. No special cases.
2. **Consistent observability:** Every operation (view state change, service call, layout interaction) is a structured event.
3. **Composability:** Layouts can guard transitions based on service state; views can guard based on layout state.
4. **Type safety:** Service call context is as fully typed as view context.
5. **Testing:** Services, layouts, and views all use the same FSM testing utilities.

---

## 4. Separation of Concerns (Modular, Composable)

### 4.1 Views = FSM + Layout + Templates

A view is **not** a file; it's a *composition*:

```
view/account/        ← Directory contains one logical view
├── account.yaml     ← FSM definition + state→template mapping
├── loading.html     ← Template for `loading` state
├── viewing.html     ← Template for `viewing` state
├── editing.html     ← Template for `editing` state
├── saving.html      ← Template for `saving` state
└── error.html       ← Template for `error` state
```

**Key insight:** One YAML file, many templates. Each template is rendered *only when the corresponding state is active*. This makes conditional rendering declarative.

### 5.2 Layouts = Shared Structure (FSM-Driven)

Layouts define the outer HTML frame (header, nav, footer, content slot):

```
layout/
├── default.html     ← Standard app layout
├── auth.html        ← Auth flow layout (no nav, full-width)
├── dashboard.html   ← Dashboard layout (sidebar, main content)
└── settings.html    ← Settings layout (tabs, panel)
```

Each layout has **named slots** (e.g., `#ux-content`, `#ux-header`). Views are mounted into these slots.

**Key advantage:** Layouts can be composed (e.g., a settings view inside a dashboard layout), and changes to layouts propagate to all views using them.

### 5.3 Services = Data Bridge (FSM-Driven)

Services are **declarative interfaces** to external systems:

```yaml
# service/market-data.yaml
services:
  marketData:
    kind: http
    baseUrl: https://api.example.com
    timeout: 5000
    endpoints:
      getQuotes:
        path: /quotes/{symbol}
        method: GET
        auth: bearerToken
      getNews:
        path: /news
        method: GET
        query: { category, limit }
        
  chatService:
    kind: jsonrpc
    url: https://chat.example.com/rpc
    auth: apiKey
    methods:
      sendMessage:
        params: { conversationId, text }
      loadConversations:
        params: {}
```

**Compilation:** Service YAML → TypeScript stub with type-safe signatures:

```typescript
// Generated
export const marketData = {
  getQuotes: (symbol: string) => Promise<Quote[]>,
  getNews: (params?: { category?: string; limit?: number }) => Promise<News[]>,
};

export const chatService = {
  sendMessage: (conversationId: string, text: string) => Promise<{ id: string }>,
  loadConversations: () => Promise<Conversation[]>,
};
```

**In FSM invokes:**
```yaml
invoke:
  src: marketData.getQuotes
  input: { symbol: "{{ route.params.symbol }}" }
on:
  SUCCESS: dataLoaded
  ERROR: loadFailed
```

The compiler validates:
- `marketData.getQuotes` exists
- Input parameters match the function signature
- SUCCESS/ERROR events are defined in the FSM

### 5.4 Validation = Rules, Not Text

Validation is **declarative; error messages are separate**:

```yaml
# validate/login.yaml
schemas:
  loginForm:
    type: object
    properties:
      email:
        type: string
        pattern: "^[^@]+@[^@]+\\.[^@]+$"
      password:
        type: string
        minLength: 8
    required: [email, password]

  accountUpdate:
    type: object
    properties:
      name:
        type: string
        minLength: 1
        maxLength: 100
      bio:
        type: string
        maxLength: 500
```

**Compilation:** YAML → TypeScript validators:

```typescript
// Generated
export const validateLoginForm = (data: unknown): { valid: boolean; errors: ValidationError[] } => {
  // Uses Ajv internally
  const result = ajv.validate(schema, data);
  return {
    valid: result,
    errors: ajv.errors?.map(e => ({
      path: e.dataPath,
      message: i18n(`error.${e.keyword}`), // e.g., "error.minLength"
    })) || [],
  };
};
```

### 5.5 i18n = Centralized, Nested

All user-visible text lives in `ux/i18n/[lang]/*.json`, organized by module:

```
ux/i18n/
├── en/
│   ├── common.json
│   ├── auth.json
│   ├── account.json
│   └── dashboard.json
├── es/
│   ├── common.json
│   ├── auth.json
│   ├── account.json
│   └── dashboard.json
└── fr/ ...
```

**Example: `ux/i18n/en/auth.json`**
```json
{
  "login": {
    "title": "Sign in to your account",
    "email_label": "Email address",
    "password_label": "Password",
    "submit": "Sign in",
    "forgot_password": "Forgot password?",
    "error": {
      "invalid_credentials": "Invalid email or password",
      "too_many_attempts": "Too many login attempts. Try again in {{ minutes }} minutes.",
      "network_error": "Network error. Please check your connection."
    }
  },
  "signup": { ... }
}
```

**Templates reference keys:**
```html
<h1>{{ i18n('login.title') }}</h1>
<label>{{ i18n('login.email_label') }}</label>
```

**Compilation:**
- Validates all keys exist across all languages
- Generates TypeScript type-safe accessor: `i18n<'login.title' | 'login.email_label' | ...>(key)`
- Supports interpolation: `i18n('error.too_many_attempts', { minutes: 5 })`

### 5.6 Tokens & Styles = Design System

**Tokens** are design primitives (colors, spacing, typography):

```yaml
# token/colors.yaml
colors:
  primary: "#007bff"
  secondary: "#6c757d"
  success: "#28a745"
  danger: "#dc3545"

# token/spacing.yaml
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "2rem"
  xl: "4rem"

# token/typography.yaml
typography:
  headings:
    h1: { "font-size": "2rem", "font-weight": "700" }
    h2: { "font-size": "1.5rem", "font-weight": "600" }
  body:
    base: { "font-size": "1rem", "line-height": "1.5" }
```

**Styles** are named compositions (UI components, layout blocks):

```yaml
# style/common.yaml
button:
  base: "px-4 py-2 rounded bg-$primary text-white"
  hover: "hover:opacity-90"
  disabled: "disabled:opacity-50 disabled:cursor-not-allowed"

card:
  base: "rounded-lg border border-$secondary bg-white p-4 shadow-sm"
  elevated: "shadow-lg"

input:
  base: "px-3 py-2 border border-$secondary rounded"
  focus: "focus:outline-none focus:ring-2 focus:ring-$primary"
```

**Compilation:**
- Tokens → CSS custom properties + TypeScript constants
- Styles → CSS classes (via Tailwind or PostCSS) + TypeScript class name helpers
- In templates, use: `<button class="{{ style('button.base button.hover') }}">` or `[ngClass]="style('button.base')"`

---

## 6. DRY Principles Applied

### 6.1 No Duplication in Templates

**Problem:** Layouts and views repeat markup (header, nav, footer).  
**Solution:** Use layout composition + slots.

A view doesn't repeat layout structure; it mounts into a layout slot:

```html
<!-- layout/default.html -->
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <header id="ux-header">
    <ux-nav-site></ux-nav-site>
  </header>
  <main id="ux-content">
    <!-- View mounts here -->
  </main>
  <footer id="ux-footer">
    <ux-footer-site></ux-footer-site>
  </footer>
</body>
</html>
```

View templates only define content for the current state:

```html
<!-- view/account/viewing.html -->
<div class="account-detail">
  <h1>{{ i18n('account.title') }}</h1>
  <form ux-on:submit="EDIT">
    <!-- Account details here -->
  </form>
</div>
```

The layout is mounted **once** on route change; only the view content is swapped per FSM state.

### 6.2 No Code Duplication in Service Calls

**Problem:** Every FSM invoke that calls a service has to specify baseUrl, auth, error handling, retry logic.  
**Solution:** Define services centrally; invokes reference them by name.

Service YAML is the single source of truth:

```yaml
# service/api.yaml
services:
  accountService:
    kind: http
    baseUrl: https://api.example.com/accounts
    auth: bearerToken
    timeout: 5000
    retries: 3

  # In FSM:
  # invoke:
  #   src: accountService.getAccount
  #   input: { id: "{{ route.params.id }}" }
```

The compiler ensures:
- `accountService.getAccount` is defined
- Auth is injected automatically
- Retries and timeouts apply globally
- Error handling is consistent

### 6.3 No i18n Key Duplication

**Problem:** Keys appear both in YAML and templates; easy to mistype or miss.  
**Solution:** Build-time validation.

The compiler:
1. Scans all templates for `{{ i18n('key') }}` calls
2. Checks that every key exists in all language files
3. Fails the build if any key is missing

```bash
$ npm run build
ERROR: Missing i18n keys in templates:
  view/account/viewing.html:12 - "account.delete_confirm" not found in es/account.json
  view/account/viewing.html:15 - "account.delete_confirm" not found in fr/account.json
```

### 6.4 No Inline Styles

**Problem:** Styles scattered across templates, hard-coded colors, repeated class names.  
**Solution:** Centralize all styles; templates reference them.

Build-time validation rejects inline styles:

```bash
$ npm run build --strict
ERROR: Inline styles found:
  view/account/editing.html:5 - <style> block not allowed. Move to ux/style/.
  view/dashboard/dashboard.html:12 - class="color: red; ..." not allowed. Use ux-style attribute instead.
```

---

## 7. FSM Guarding & Constraints

Each view's FSM is **fully guarded**. Transitions are not unconditional:

```yaml
# view/checkout/checkout.yaml
states:
  cart:
    on:
      PROCEED:
        target: shipping
        guard: "{{ cart.items.length > 0 }}"  # Can only proceed if cart has items
  
  shipping:
    on:
      NEXT:
        target: payment
        guard: "{{ shipping.address !== null }}"
  
  payment:
    invoke:
      src: processPayment
      input: { amount: "{{ cart.total }}" }
    on:
      SUCCESS: confirmation
      ERROR: payment
```

The compiler:
1. Extracts guard conditions (as TypeScript predicates)
2. Validates that guard expressions reference valid context properties
3. Generates type-safe guard functions:

```typescript
// Generated
function canProceed(context: CheckoutContext): boolean {
  return context.cart.items.length > 0;
}

fsm.on('PROCEED', {
  target: 'shipping',
  guard: canProceed,
});
```

At runtime:
- If guard returns `false`, the transition is rejected silently.
- If guard returns `true`, transition proceeds.

---

## 8. Type Safety Everywhere

Every artifact is **fully typed**. No `any` types; no runtime surprises.

### 8.1 Service Invokes
```typescript
// From service/api.yaml
const loadAccount = (id: string) => Promise<Account>
const saveAccount = (id: string, data: AccountUpdate) => Promise<Account>

// FSM invoke references
invoke:
  src: loadAccount
  input: { id: "{{ route.params.id }}" }  // Type-checked: must resolve to string
```

### 8.2 FSM Context
```typescript
// Inferred from view.yaml states and bindings
type AccountViewContext = {
  account?: Account;
  isLoading: boolean;
  error?: string;
  formData?: AccountUpdate;
};

// FSM is fully typed
fsm: StateMachine<AccountViewContext>;
```

### 8.3 Template Bindings
```typescript
// From template analysis
type TemplateBindings = {
  events: Array<{ element: string; event: string; action: string }>;
  reactive: Array<{ element: string; property: string; signal: string }>;
  i18n: Array<{ element: string; key: string }>;
};

// Validated at compile time
```

### 8.4 i18n Keys
```typescript
type I18nKey = 
  | 'common.submit'
  | 'common.cancel'
  | 'auth.login_title'
  | 'auth.login_email'
  | ...;

const i18n = (key: I18nKey, params?: Record<string, any>) => string;
```

---

## 9. Wide & Deep App Surface

The IAM example proves this works at scale:

| Dimension | IAM Scale | UX3 Solution |
|-----------|-----------|--------------|
| **20+ views** | account, login, dashboard, chat, etc. | Each view YAML maps to 1 directory; templates scale linearly |
| **Multi-state flows** | login → dashboard → account edit → save | Each view owns its FSM; guards protect transitions |
| **Services (5+)** | HTTP, JSON-RPC, WebSocket | Service YAML defines all; invokes are type-checked |
| **Layouts (4+)** | auth, default, dashboard, settings | Reusable layout HTML; views mount into slots |
| **i18n (4 languages)** | en, es, fr, de | Centralized JSON files; compiler validates all keys |
| **Tokens & styles** | 30+ colors, 8 spacing levels, button/card/form styles | YAML specs → CSS + TypeScript; no duplication |
| **Validation** | login form, account update, checkout | YAML schemas → validators; error messages are i18n-aware |
| **Routes** | Home, Login, Account, Dashboard, etc. | YAML routes → route matchers; guards enforce preconditions |

**Result:** Zero manual wiring. The entire surface is declared; the compiler wires it.

---

## 10. Implementation Roadmap

### Phase 1: Core Compiler Hardening (Weeks 1-2)
- [ ] **Validation engine** (enhanced)
  - Circular dependency detection (services, routes)
  - Template reference validation (all i18n keys, all template paths)
  - FSM state reachability analysis
  - Guard expression parsing and type checking
  - **Fail CI on violations**

- [ ] **Binding extractor** (enhanced)
  - Parse all four binding types (events, reactive, i18n, widgets)
  - Validate bindings against FSM context types
  - Extract and validate guard expressions
  - **Generate validation report**

- [ ] **View compiler** (hardened)
  - Generate TypeScript from YAML + templates
  - Inject FSM configs as static class properties
  - Validate all template references resolve
  - Generate `.types.ts` for each view

- [ ] **Config generator** (completed)
  - Merge all specs into `generated/config.ts`
  - Generate route matcher functions
  - Generate service registry with types
  - Generate i18n provider with type-safe keys

### Phase 2: AppContext & Bootstrap (Weeks 2-3)
- [ ] **AppContextBuilder** (complete)
  - Initialize FSMRegistry from machine configs
  - Initialize ServiceContainer with authenticated clients
  - Set up Router with guards and preloading
  - Inject i18n provider with language detection
  - Create DI container for widgets

- [ ] **Root component & routing** (complete)
  - Root view that mounts to DOM
  - Router listens to URL changes
  - Route → FSM initial state mapping
  - Route guards (auth, permissions)
  - Breadcrumb/nav sync

- [ ] **Widget factory** (complete)
  - Lazy load view components on demand
  - Inject AppContext into views
  - Setup error boundaries
  - Handle missing/failed views

### Phase 3: Observability & Optimization (Weeks 3-4)
- [ ] **Telemetry system**
  - FSM transition events
  - Service call tracking (latency, errors)
  - View mount/unmount events
  - Template swap timing
  - User interaction tracking
  - **DevServer dashboard** to display live telemetry

- [ ] **Performance budgets**
  - Bundle size per chunk
  - Initial load time
  - TTI (time to interactive)
  - FSM transition latency
  - Service call latency
  - **Fail CI on budget violations**

- [ ] **Error handling & recovery**
  - Global error boundary
  - Fallback UIs per FSM state
  - Network error retry logic
  - User-facing error messages (via i18n)
  - Error reporting (Sentry, DataDog, etc.)

### Phase 4: Developer Experience (Weeks 4+)
- [ ] **DevServer enhancements**
  - Hot reload on YAML changes (view, service, i18n, token)
  - Syntax highlighting for YAML specs
  - Live preview of FSM state machine diagrams
  - i18n key lookup and validation
  - Template preview with mock data
  - Service call tracing and replay

- [ ] **CLI tooling**
  - `ux3 new <name>` scaffolding (view, service, schema)
  - `ux3 compile` with detailed diagnostics
  - `ux3 validate --strict` (lint mode)
  - `ux3 docs` (generate API docs from specs)

- [ ] **Testing utilities**
  - FSM testing helpers (state assertions, transition checks)
  - Mock service clients
  - Template rendering harness with context injection
  - i18n test fixtures
  - E2E test generation from routes

---

## 11. Acceptance Criteria & Metrics

### Must-Have (Phase 1-2)
- [ ] All 20+ IAM views compile without errors
- [ ] All routes are reachable and FSM guards work correctly
- [ ] All i18n keys are present and render correctly
- [ ] All services are type-safe and invokes are validated
- [ ] Build fails on validation errors (missing keys, broken refs, circular deps)
- [ ] Generated code is <100KB gzipped for runtime (config + appContext)
- [ ] View component chunks are <20KB gzipped average

### Should-Have (Phase 3)
- [ ] Telemetry is emitted for all major operations
- [ ] DevServer shows live FSM state diagrams
- [ ] Performance budgets are enforced in CI
- [ ] Error handling is graceful (no white screens)
- [ ] Analytics can track user flows through FSMs

### Nice-to-Have (Phase 4+)
- [ ] CLI scaffolding works smoothly
- [ ] Hot reload works for all spec changes
- [ ] Testing harness is used in 50%+ of tests
- [ ] E2E tests are auto-generated from routes
- [ ] Docs are generated automatically

---

## 12. Key Decisions & Trade-offs

### 12.1 FSM-First, Not Hook-First
**Decision:** FSM is the spine; all control flow goes through FSM transitions and guards.  
**Why:** Declarative, observable, type-safe. No imperative callbacks that hide logic.  
**Trade-off:** Can't express every flow pattern in an FSM easily. Some async sequences need careful guard design.  
**Mitigation:** Provide FSM patterns library (sequential, parallel, retry, backoff) and examples.

### 12.2 Compile-Time Over Runtime
**Decision:** Validation, type checking, code generation all happen at build time.  
**Why:** Catches errors early; reduces runtime overhead; enables optimizations.  
**Trade-off:** Slower development feedback loop if compiler is slow.  
**Mitigation:** Implement incremental compilation (only recompile changed specs).

### 12.3 YAML Over TypeScript for Specs
**Decision:** Application logic lives in YAML (declarative); TypeScript is for behavior only.  
**Why:** YAML is human-readable, schema-validated, easy to audit and diff.  
**Trade-off:** YAML doesn't support full expressive power of code (complex logic, conditionals).  
**Mitigation:** TypeScript handlers for advanced logic (guards, transforms); keep them small and focused.

### 12.4 Web Components for Views
**Decision:** Each view is a Web Component (extends HTMLElement).  
**Why:** Native isolation, reusability, no framework lock-in.  
**Trade-off:** Less rich ecosystem than React/Vue (fewer plugins, patterns).  
**Mitigation:** Build UX3-specific helpers (reactive binding, event delegation) and patterns library.

### 12.5 No Framework Dependencies
**Decision:** UX3 core has zero framework dependencies (no React, Vue, Angular).  
**Why:** Smaller bundle, faster startup, full control over rendering.  
**Trade-off:** Need to build reactive system from scratch (signals, effects, computed).  
**Mitigation:** Use proven patterns (proxy-based reactivity, dependency tracking).

---

## 13. Examples from IAM

### 13.1 Login Flow
```yaml
# ux/view/login.yaml
name: Login
layout: auth
initial: idle
states:
  idle:
    template: view/login/idle.html
    on:
      SUBMIT:
        target: submitting
        guard: "{{ form.email && form.password }}"
  
  submitting:
    template: view/login/submitting.html
    invoke:
      src: authService.login
      input: { email: "{{ form.email }}", password: "{{ form.password }}" }
    on:
      SUCCESS: success
      ERROR: error
  
  success:
    template: view/login/success.html
  
  error:
    template: view/login/error.html
    on:
      RETRY: idle
```

**Flow:**
1. User lands on `/login` → Router creates LoginView with FSM in `idle` state
2. User enters email/password, clicks Submit → FSM checks guard, sends SUBMIT event
3. FSM transitions to `submitting`, invokes `authService.login`
4. Service returns token → FSM sends SUCCESS event, transitions to `success`
5. (User navigated to `/dashboard` by success handler) → New Router state, new AppContext

**Type safety:**
- `authService.login` is type-checked (parameters, return type)
- Guard `form.email && form.password` is validated against FSM context type
- `template` paths are validated to exist
- SUCCESS/ERROR events are validated to be valid transitions

### 13.2 Account Edit Flow
```yaml
# ux/view/account.yaml
name: Account
layout: default
initial: loading

states:
  loading:
    template: view/account/loading.html
    invoke:
      src: accountService.getAccount
      input: { id: "{{ route.params.id }}" }
    on:
      SUCCESS: viewing
      ERROR: error

  viewing:
    template: view/account/viewing.html
    on:
      EDIT: editing

  editing:
    template: view/account/editing.html
    on:
      SAVE: saving
      CANCEL: viewing

  saving:
    invoke:
      src: accountService.updateAccount
      input: { id: "{{ route.params.id }}", data: "{{ formData }}" }
    on:
      SUCCESS: viewing
      ERROR: editing

  error:
    template: view/account/error.html
    on:
      RETRY: loading
```

**Composition:**
- `account` view shares `default` layout with other views (dashboard, chat, etc.)
- Multiple FSM states with associated templates
- Route params are injected into invoke inputs
- Form data is captured from template bindings and available in FSM context
- Error state has explicit recovery path (RETRY → loading)

**What this eliminates:**
- No imperative form handling (it's just template bindings)
- No dangling promises (invoke is the only async entry point)
- No missing error handlers (ERROR transition is required)
- No circular navigation (FSM graph is a DAG)

---

## 14. Open Questions & Future Work

1. **Nested FSMs:** Can a view's FSM be hierarchical (parent/child states)? How do they coordinate?
2. **Form state:** Should form validation be part of the FSM, or separate? (Currently separate; could be integrated.)
3. **Optimistic updates:** How to handle optimistic UI updates when a service call is in flight?
4. **Offline mode:** Should the FSM support offline-first patterns (queuing, sync)?
5. **Multi-view flows:** Wizard-like flows that span multiple views—how to model?
6. **A/B testing:** How to declare variants in specs and route traffic?
7. **Analytics:** How to auto-instrument FSM transitions and service calls for analytics?

---

## 15. Success Criteria (By End of Phase 4)

1. **Compile time:** < 2 seconds for IAM-scale app (20+ views, 5+ services)
2. **Runtime bundle:** View components < 15KB gzipped average
3. **Validation:** All errors caught at compile time, zero runtime surprises
4. **Developer experience:** DevServer hot-reload works for all spec changes
5. **Type coverage:** 100% of service invokes, FSM contexts, and i18n keys are typed
6. **Documentation:** Auto-generated API docs from YAML specs
7. **Testing:** 80%+ of IAM views have FSM tests (state transitions, guards, invokes)
8. **Community:** Example apps exist for common patterns (login, CRUD, wizard, multi-step form)

---

## Conclusion

**UX3 is a compiler, not a framework.**

The application **is** the configuration. The compiler wires it. The result is a type-safe, observable, maintainable system with zero manual integration.

This plan makes that vision concrete by:
1. **Treating FSM as the universal spine** (all stateful things—views, services, layouts—are FSM-driven with canonical minimal event sets)
2. Centralizing all specs in YAML (one file, one responsibility)
3. Validating aggressively at compile time (fail fast, fail early)
4. Generating type-safe code (no `any`, no runtime surprises)
5. Supporting IAM-scale complexity (20+ views, 5+ services, multi-language, multi-layout)
6. Providing observability by default (telemetry, error tracking, performance budgeting)

**The unifying insight:** Services and layouts are not exceptions; they are special views with FSMs. This means a single mental model (FSM) covers views, services, and layouts. Every operation is a structured event. Every transition is guarded. Everything is observable and type-safe.

**Next step:** Review this plan with the team. Identify blockers. Start Phase 1.
