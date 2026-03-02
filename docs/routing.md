# Routing

Overview
---
Routing in UX3 is driven by `ux/route/routes.yaml` and compiled into `generated/routes.ts`. Routes wire URLs to top-level views and support `:param` segments and route guards.

The runtime routing pipeline is:

```
URL change / page load
  → setupNavigation(context)           called once at the end of createAppContext()
  → findRouteForPath(pathname, routes)  parameterised matching: /market/:exchange
  → mountView(viewName)                clears #ux-content, inserts <ux-viewname>
  → ViewComponent.connectedCallback()  binds FSM, renders initial state template
```

`setupNavigation` is called automatically at the end of `createAppContext()` —
**no manual wiring is required** in application entry points.

Where to look
---
- `examples/iam/ux/route/routes.yaml` — route definitions
- `src/ui/navigation-handler.ts` — `setupNavigation`, `navigateTo`, `mountView`
- `src/services/router.ts` — `NavConfig`, `NavRoute` types, `Router` class
- Generated output: `examples/iam/generated/routes.ts`

Route parameters
---
Parameterised routes use `:name` segments:

```yaml
routes:
  - path: /market/:exchange
    view: market
```

The navigation handler builds a regex from the pattern
(`/market/(?<exchange>[^/]+)`) to extract named params. Multiple param segments
in a single path are supported.

Programmatic navigation
---
```typescript
import { navigateTo } from '@ux3/ui/navigation-handler.js';
navigateTo('/market/NASDAQ', appContext);
```

`navigateTo` pushes a history entry, clears `#ux-content`, and inserts the
matching view element.

Guidelines
---
- Define routes declaratively in YAML; use `:param` segments and optional guards when needed.
- Keep route handlers thin; heavy lifting belongs in views and services.
- The host HTML must contain `<main id="ux-content">` for the navigation handler.
- Generated views must `customElements.define('ux-<view>', ViewClass)` **before**
  `initApp()` runs — import `generated/views/index.js` at the top of your entry.

Testing
---
- Unit-test `navigateTo` in isolation by providing a stub `AppContext` with a `nav`
  object (`{ routes, canNavigate: () => true }`).
- See `tests/ui/navigation-handler.test.ts` for examples.

Reference
---
- `src/cli/compile.ts` for compile-time behavior
- `src/build/manifest-generator.ts` for how routes are included in the build
