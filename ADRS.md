# Architecture Decision Records

## ADR-1: YAML-first declarative config

**Decision:** All non-behavioral app concerns (views, routes, styles, i18n, validation, tokens, services) are declared in YAML under `ux/`. Imperative TypeScript is reserved for guards, actions, invokers (`ux/logic/`), and FSM definitions that require dynamic composition.

**Rationale:** Compile-time validation, type generation, and structural consistency; minimizes hand-written boilerplate. Keeps behavioral code surface area minimal.

**YAML→TS codegen pipeline:**
```
ux/widget/*.yaml + ux/widget/**/*.html → ViewCompiler → generated/views/*.ts
ux/style/*.yaml                          → ConfigGenerator → generated/config.ts
ux/token/*.yaml                          → ConfigGenerator → generated/tokens.css
ux/i18n/**/*.yaml                        → ConfigGenerator → generated/i18n.ts
ux/content/**/*.md                       → ContentGenerator → generated/content.ts
```

**Invariant:** `generated/` is build output only — never committed.

---

## ADR-2: FSM is the UI primitive

**Decision:** Every view is a finite state machine. State transitions are event-driven with guards and actions. No ad-hoc state management inside component classes.

**Rationale:** Explicit, auditable state modeling. Complex interactions remain predictable. Built-in retry with exponential backoff for service invocations.

**FSM config shape (YAML):**
```yaml
name: view-name
layout: default
initial: idle
states:
  idle:
    template: widget/view-name/idle.html
    on:
      SUBMIT: { target: loading, guard: isValid, actions: [track] }
  loading:
    invoke: { src: fetchData, onDone: success, onError: error }
  success:
    template: widget/view-name/success.html
```

**FSM code shape (TypeScript in `ux/logic/`):**
- Guards: `(ctx) => boolean`
- Actions: `(ctx, event) => void | Partial<Context>`
- Invokers: `(ctx, input?) => Promise<Result>`

**Idioms:**
- State names are kebab-case strings (`showcase-capability`)
- Event names are UPPER_SNAKE_CASE
- FSM files use `*.yaml`; no code-gen prefix required

---

## ADR-3: Custom element naming

**Decision:** All framework primitive elements use `ux-` prefix. 73 built-in primitives registered via `registerBuiltInPrimitives()`. No Shadow DOM for primitives; they extend `LifecycleComponent` (light DOM). Only `ViewComponent` uses Shadow DOM.

**Primitive categories:** layout/shell, interaction, navigation, data-display, forms, feedback, media, charts, chat, special.

**Invariant:** Project views must not define new `ux-*` custom elements. New primitives go in `src/ui/widget/primitives.ts` with framework code review.

---

## ADR-4: ViewComponent hierarchy

**Decision:** Two-tier base class hierarchy:

1. **`LifecycleComponent extends HTMLElement`** — light DOM, lifecycle hooks (`onConnected`, `onDisconnected`, `onAttributeChanged`), cleanup management (`listen`, `observe`, `manageCleanup`). No FSM/layout dependency.

2. **`ViewComponent<Context> extends LifecycleComponent`** — Shadow DOM, FSM-driven, layout+template stamping, event delegation. Each subclass has: layout, FSM, state→template map, bindings (events, reactive signals, i18n keys, child widgets).

**Invariants:**
- Layout must contain `<main id="ux-content">` (or `<ux-view>` as alias that gets normalized)
- `onConnected()` retrieves `AppContext` from `window.__ux3App`
- Template swapping tears down old DOM before stamping new
- Font-family set explicitly on `#ux-layout` in shadow (Tailwind CDN does not penetrate Shadow DOM)

---

## ADR-5: Layout & chrome layering

**Decision:** Three-tier layout with clear roles:

| Layer | File | Scope | Contains |
|---|---|---|---|
| Chrome wrapper | `ux/layout/_.html` | Server-only | `<html>`, `<head>`, `<body>`, full shell, scripts |
| View layout | `ux/layout/default.html` | SPA shadow DOM | Shell (kitchen-app, topbar, `#ux-content`), no `<html>` |
| Template | `ux/widget/*/index.html` | Content | Sections, components, no shell chrome |

**Resolution order (dev server `getShellLayout`):**
1. `ux/layout/<name>.html` (exact match)
2. `ux/layout/<name>/_.html`
3. `ux/layout/_.html` (project default)
4. `src/ui/layouts/_.html` (framework fallback)

**Dedup invariant:** `resolveAndRenderLayout` skips `viewLayoutHtml` wrapping when `chromeWrapperHtml` is present. Chrome wrapper is the sole server skeleton. View layout is for SPA shadow DOM only.

**Template interpolation tokens:**
- `{{{ content }}}` — raw HTML insertion (preferred)
- `{{ >layout }}` — partial insertion
- `{{{ site.head }}}` / `{{{ site.scripts }}}` — framework injection points

---

## ADR-6: Style system — ux-style + variants

**Decision:** Styles are key→class-string mappings registered at config time, resolved at runtime via `[ux-style]` / `[data-style]` attributes. No CSS-in-JS.

**Two forms (schema: `style.schema.json`):**

```yaml
# String alias
button: "px-4 py-2 rounded font-medium"

# Structured variant object
button:
  base: "px-4 py-2 rounded font-medium"
  variants:
    variant:
      primary: "bg-blue-600 text-white hover:bg-blue-700"
      secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300"
    size:
      sm: "text-sm py-1 px-3"
      lg: "text-lg py-3 px-6"
  defaults:
    variant: primary
    size: sm
```

**Runtime:**
- `StyleRegistry.registerStyles(flatMap)` / `.registerStyleObjects(objects)`
- `applyStyles(root)` scans `[ux-style]`/`[data-style]` attributes, appends resolved classes (preserving existing)
- Hooks `ViewComponent.prototype.mountLayout` for auto-apply
- Triggers `tailwind.refresh()` after injection for CDN mode

**Invariants:**
- Style keys are camelCase
- `kitchen-app`, `section`, `row`, `grid`, `button-row` are reserved structural keys
- All templates use `ux-style="key"` attributes (never hard-coded classes in templates)

---

## ADR-7: Plugin architecture

**Decision:** Plugin contract with lifecycle hooks, dependency tracking, and semver constraints.

```typescript
interface Plugin {
  name: string;
  version: string;
  install?(app: AppContext): void | Promise<void>;
  uninstall?(app: AppContext): void | Promise<void>;
  hooks?: { app?: HookMap; component?: HookMap; service?: HookMap };
  components?: Record<string, ComponentFactory>;
  services?: Record<string, ServiceFactory>;
}
```

**Lifecycle hooks:** `AppLifecyclePhase` (INIT→CONFIG→BUILD→HYDRATE→READY→DESTROY), `ComponentLifecyclePhase` (CREATE→MOUNT→RENDER→UPDATE→UNMOUNT→DESTROY), `ServiceLifecyclePhase` (REGISTER→CONNECT→AUTHENTICATE→READY→ERROR→RECONNECT→DISCONNECT).

**Invariants:**
- Plugins loaded in dependency order (topological sort)
- Plugin stubs (from `service-factory.ts:buildPluginStub`) are plain objects, never functions (strict mode prohibits `.name` assignment on async functions in ES modules)
- Plugin config in `ux3.yaml` under `plugins: [{ name, config }]`

---

## ADR-8: Widget factory — lazy loading

**Decision:** `WidgetFactory` with lazy-loading, deduplication, caching, and circular dependency detection.

**Key behaviors:**
- `registerLazy(name, loader)` for code-split loaders
- Pending loads tracked by `Promise` — concurrent requests coalesce
- `activeLoads: Set<string>` tracks in-flight loads for circular dep detection
- Uses `AsyncLocalStorage` for proper async context isolation in Node.js

---

## ADR-9: Template engine — Handlebars-Lite (HBS)

**Decision:** Custom lightweight Mustache/Handlebars implementation. No external template library dependency.

**Supported syntax:**
- `{{ var }}` — escaped interpolation
- `{{{ var }}}` — raw HTML interpolation
- `{{#if condition}}...{{/if}}` — conditional block
- `{{#each items}}...{{/each}}` — iteration (context: `this`, `@index`)
- `{{#unless condition}}...{{/unless}}` — negated conditional
- `{{>partial}}` — partial include

**Built-in helpers:** `eq`, `ne`, `gt`, `lt`, `gte`, `lte`, `and`, `or`, `not`, `length`, `join`, `first`, `last`, `includes`, `formatDate`, `truncate`, `upper`, `lower`, `capitalize`

**Pipeline:** `template → Lexer → Tokens → Parser → AST → Evaluator → String`

---

## ADR-10: State management

**Decision:** Two-tier reactive state:
1. **FSM context** — per-view state machine context (declarative, event-driven)
2. **Reactive store** — cross-cutting app state (`src/state/reactive.ts`, Solid.js-inspired signals): `reactive()`, `effect()`, `computed()`, `batch()`

**Invariant:** View-component local state lives in FSM context. `Store` is for shared/global state only.

---

## ADR-11: I18n resolution

**Decision:** Nested YAML per locale under `ux/i18n/{locale}/*.yaml`. Keys mirror view/route hierarchy.

**Locale resolution:** preferred → `en` → first available locale → raw i18n config as payload.

**Mandatory keys:** `site.title`, `site.description` (enforced at startup via `requireI18nSiteMetadata`).

**Template binding:** `{{ i18n.nav.home }}` in HBS, `ux-translate` attribute for runtime rebinding on locale change.

---

## ADR-12: Module & package convention

**Decision:** ESM-only (`"type": "module"`). Sub-path exports for framework consumers:

| Import | Source |
|---|---|
| `@ux3/ux` | Framework core |
| `@ux3/ux/widget` | Widget system |
| `@ux3/ux/fsm` | State machine |
| `@ux3/ux/ui` | ViewComponent, LifecycleComponent, styles, app context |
| `@ux3/ux/routing` | Routing |
| `@ux3/ux/validation` | Validation engine |
| `@ux3/ux/state` | Reactive state store |
| `@ux3/ux/security` | Sanitizer, observability, CSRF |
| `@ux3/ux/a11y` | Accessibility |

**Invariant:** No `any` types in exports — use `unknown` or generics.

---

## ADR-13: Directory layout convention for projects

```
project/
  ux3.yaml                # project config
  ux/
    widget/                # YAML FSM definitions + HTML templates
    style/                 # style key→class mappings
    token/                 # design tokens (colors, spacing, typography)
    i18n/{locale}/         # translation keys
    logic/                 # guards, actions, invokers (TS)
    layout/                # chrome + view layouts
    route/                 # path→view mappings
    service/               # service declarations
    validate/              # validation rules
  src/
    fsm/                   # project FSM logic
    index.ts               # entry point
  generated/               # build output (gitignored)
```

**Invariants:**
- `widget/` is the canonical directory name; `view/` is legacy fallback
- View YAML names use kebab-case matching directory name
- Template paths in YAML are relative to `ux/` directory

---

## ADR-14: Build pipeline

**Decision:** esbuild-based bundler with custom `@ux3/` resolver plugin. `ux3 build` → `dist/bundle.js`.

**Build steps:**
1. Config generation (merge YAML → `GeneratedConfig`)
2. Token CSS generation
3. Type generation
4. Service resolution
5. Configuration validation (Ajv JSON Schema + advanced validators)
6. View compilation
7. Content processing (markdown → manifest)
8. Entry generation
9. Bundling (esbuild + @ux3/ resolver)

**Watch mode:** SSE-based hot reload via `BuildWatcher` + dev server event stream.

---

## ADR-15: Testing

**Decision:** Vitest (jsdom) for unit/integration, Playwright for E2E. Declarative YAML-based test runner for macro-level scenarios.

**Test directories:** `tests/{subsystem}/` mirrors `src/{subsystem}/`. Plugin tests in `tests/plugin-{name}/`.

**Declarative test step types:** `event`, `input`, `click`, `wait`, `assert`, `assertState`, `fsmState`, `macro`, `fixture`.

**Invariant:** All new widgets must include tests. Test files use `.test.ts` suffix.

---

## ADR-16: Security invariants

**Decision:** Security is not optional — sanitizer, CSRF, input validation are first-class framework modules under `src/security/`.

- **Sanitizer** (`security/sanitizer.ts`): OWASP-based HTML sanitization, called on all user-originated content before rendering
- **CSRF** (`security/validator.ts`): Token-based protection with configurable header/param
- **Validation** (`validation/`): Rule engine with declarative YAML schema, integrated with forms
- **Observability** (`security/observability.ts`): Structured logging with severity levels

**Invariant:** Never render unsanitized user content. Use `{{{ sanitized }}}` (pre-sanitized) or auto-sanitize before raw HTML interpolation.

---

## ADR-17: Code style invariants

- TypeScript strict mode always
- No `any` types in public API (use `unknown` or generics)
- No comments in code unless explaining non-obvious logic
- ESLint config passes (`.eslintrc.json`)
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`
- Package manager: pnpm 8+
- Node engine: >= 18

---

## ADR-18: Service adapter pattern

**Decision:** Services are declared in YAML and resolved to adapter implementations at build time. Adapters include HTTP, WebSocket, JSON-RPC, file, router, i18n runtime, invoke registry.

**Service YAML shape:**
```yaml
services:
  api:
    adapter: http
    baseUrl: https://api.example.com
    auth: bearer
    reconnect: true
    caching: 300s
```

---

## ADR-19: Topbar/chrome deduplication

**Decision:** Server-rendered HTML must have exactly one shell. Dev server `resolveAndRenderLayout` applies `viewLayoutHtml` wrapping only when `chromeWrapperHtml` is absent. With a project `_.html` (chrome wrapper), the view layout is skipped server-side. SPA shadow DOM independently renders `default.html` for client-side navigation.

**Critical invariant:** After SPA init, light DOM shell and shadow DOM shell overlap identically — only one visible topbar renders. `#ux-content` exists in both light DOM (for navigation handler `ensureMountPoint()`) and shadow DOM (for `ViewComponent.renderState()`).
