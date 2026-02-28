# App Context — Dependency Injection & Configuration

## Overview

The `AppContext` is the runtime DI container that wires together FSMs, services, widgets, templates, and styles into a cohesive application. It's created via `AppContextBuilder` from generated configuration and made available globally.

**Key responsibilities:**
- Manage FSM registry and instances
- Provide service clients (HTTP, WebSocket, JSON-RPC)
- Load and resolve templates
- Handle i18n key lookups
- Store styles and widgets
- Manage routing/navigation config

---

## AppContext Interface

```typescript
export interface AppContext {
  // FSM instances by namespace
  machines: Record<string, StateMachine<any>>;
  
  // Service clients
  services: Record<string, Service>;
  
  // Template lookup function
  template: (name: string) => string;
  
  // i18n lookup function
  i18n: (key: string, props?: Record<string, any>) => string;
  
  // Style classes by key
  styles: Record<string, string>;
  
  // Widget factory
  widgets: WidgetFactory;
  
  // Global UI state
  ui: Record<string, Widget>;
  
  // Navigation config (routes, guards)
  nav: NavConfig | null;
}
```

---

## Creating App Context

### Using AppContextBuilder

```typescript
import { AppContextBuilder } from '@ux3/ui';
import config from './generated/config.js';

const appContext = await new AppContextBuilder(config)
  .withMachines()
  .withServices()
  .withWidgets()
  .withI18n()
  .withTemplates()
  .withStyles()
  .withNavigation()
  .build();

// Make available globally
window.__ux3App = appContext;
```

### Direct Configuration

```typescript
const config: GeneratedConfig = {
  routes: [
    { path: '/', view: 'home' },
    { path: '/auth', view: 'login' }
  ],
  services: {
    api: {
      type: 'http',
      config: { baseURL: 'https://api.example.com' }
    }
  },
  machines: {
    auth: { /* FSM config */ },
    todos: { /* FSM config */ }
  },
  i18n: {
    en: {
      'home.title': 'Home',
      'auth.login': 'Login'
    }
  },
  widgets: {
    'button-primary': { path: './widgets/button.js' },
    'card': { path: './widgets/card.js', lazy: true }
  },
  styles: {
    'btn-primary': 'px-4 py-2 bg-blue-500 text-white rounded',
    'card': 'border rounded-lg shadow'
  },
  templates: {
    'default': '<div id="layout"><div id="ux-content"></div></div>',
    'auth': '<div id="layout"><div id="ux-content"></div></div>'
  }
};

const appContext = new AppContextBuilder(config)
  .withMachines()
  .withServices()
  // ...
  .build();
```

---

## Builder Fluent API

### withMachines()

Instantiates all state machines:

```typescript
.withMachines()
  // Creates FSM instances for each machine in config
  // Subscribes to transitions for telemetry
  // Registers in global FSMRegistry
```

### withServices()

Creates service clients:

```typescript
.withServices()
  // Supported types: 'http', 'websocket', 'jsonrpc', 'mock'
  // Each service is wired with its config
```

### withWidgets()

Initializes widget factory:

```typescript
.withWidgets()
  // Registers all widget paths
  // Sets up lazy-loading for deferred widgets
```

### withI18n()

Loads translation bundles:

```typescript
.withI18n()
  // Aggregates i18n by locale
  // Provides lookup function: i18n(key, props)
```

### withTemplates()

Compiles template registry:

```typescript
.withTemplates()
  // Stores all compiled templates
  // Provides template(name) lookup function
```

### withStyles()

Prepares style classes:

```typescript
.withStyles()
  // Stores style class mappings
  // Available via styles[key]
```

### withNavigation()

Configures routing:

```typescript
.withNavigation()
  // Creates Router instance
  // Validates route definitions
  // Sets up navigation guards
```

### build()

Returns complete AppContext:

```typescript
const appContext = await builder.build();
```

---

## Global Access

### Setting Context

```typescript
// After building, make available to views
window.__ux3App = appContext;
```

### Accessing in Views

Views automatically access global context:

```typescript
// In ViewComponent
connectedCallback() {
  this.app = (window as any).__ux3App;
  
  // Access FSMs
  const authFsm = this.app.machines['auth'];
  
  // Lookup templates
  const template = this.app.template('login-form');
  
  // Translate
  const label = this.app.i18n('home.title');
  
  // Get styles
  const classes = this.app.styles['btn-primary'];
}
```

---

## Service Integration

### HTTP Service

```typescript
const config = {
  services: {
    api: {
      type: 'http',
      config: {
        baseURL: 'https://api.example.com',
        headers: { 'Authorization': 'Bearer token' }
      }
    }
  }
};

// Usage
const response = await appContext.services.api.fetch('/users');
const json = await response.json();
```

### JSON-RPC Service

```typescript
const config = {
  services: {
    rpc: {
      type: 'jsonrpc',
      config: {
        url: 'https://example.com/rpc'
      }
    }
  }
};

// Usage
const result = await appContext.services.rpc.call('getUser', { id: 1 });
```

### WebSocket Service

```typescript
const config = {
  services: {
    ws: {
      type: 'websocket',
      config: {
        url: 'wss://example.com/ws'
      }
    }
  }
};

// Usage
appContext.services.ws.subscribe('messages', (msg) => {
  console.log(msg);
});
```

### Mock Service

```typescript
const config = {
  services: {
    mock: {
      type: 'mock',
      config: {}
    }
  }
};

// Returns predefined responses for testing
const result = await appContext.services.mock.call('testMethod');
```

---

## Template Registry

Templates are looked up by name:

```typescript
// Get template for a view state
const template = appContext.template('login-idle');

// Layouts
const layout = appContext.template('default');

// Custom
const custom = appContext.template('dashboard-header');
```

Template names follow convention:
- View templates: `{viewName}-{stateName}`
- Layouts: `{layoutName}`
- Partials: `{featureName}-{component}`

---

## i18n Lookup

Translate keys with optional interpolation:

```typescript
// Simple translation
appContext.i18n('home.title')
// → "Home"

// With interpolation
appContext.i18n('greeting', { name: 'Alice' })
// → "Hello, Alice"

// Nested keys
appContext.i18n('auth.errors.invalid-email')
// → "Please enter a valid email"
```

---

## Example: Full Setup

```typescript
// main.ts
import { AppContextBuilder } from '@ux3/ui';
import config from './generated/config.js';

async function initApp() {
  try {
    // Build context
    const appContext = await new AppContextBuilder(config)
      .withMachines()
      .withServices()
      .withWidgets()
      .withI18n()
      .withTemplates()
      .withStyles()
      .withNavigation()
      .build();

    // Make available globally
    window.__ux3App = appContext;

    // Mount app
    const root = document.getElementById('app');
    if (root) {
      root.innerHTML = `
        <ux-app>
          <ux-login ux-fsm="auth" ux-view="login"></ux-login>
        </ux-app>
      `;
    }

    console.log('✓ App initialized');
  } catch (error) {
    console.error('✗ App initialization failed:', error);
  }
}

initApp();
```

---

## Error Handling

### Builder Errors

```typescript
const builder = new AppContextBuilder(config);

// Errors are collected, not thrown immediately
builder.withMachines();  // May fail gracefully
builder.withServices();  // May fail gracefully

const appContext = await builder.build();
// Check appContext for errors
```

### Validation

Builders validate configuration:

```typescript
// Checks:
// - routes reference existing views
// - services have valid types
// - templates exist
// - i18n keys are complete
// - FSM cycles are valid
```

---

## Best Practices

1. **Build once, reuse**: Create AppContext at startup, not per view
2. **Set globally early**: Make available to all views before mounting
3. **Validate config**: Ensure generated config is complete
4. **Use type-safe lookups**: Import types from generated config
5. **Handle initialization errors**: Catch and log failures gracefully

---

## Reference

- Source: [src/ui/context-builder.ts](src/ui/context-builder.ts)
- Interface: [src/ui/app.ts](src/ui/app.ts)
- Builder usage: [examples/iam/app.ts](examples/iam/app.ts)
