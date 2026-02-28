# View Components — FSM-Driven Rendering

## Overview

`ViewComponent` is the base class for all UX3 views. It bridges FSM state to DOM rendering, handling:
- FSM binding and subscriptions
- Layout mounting to Shadow DOM
- Template swapping on state changes
- Event binding and reactive updates
- Lifecycle management (mount/unmount)

---

## Architecture

### Component Lifecycle

```
1. connectedCallback()
   ├─ Resolve AppContext from window.__ux3App
   ├─ Extract ux-fsm, ux-view, ux-layout attributes
   ├─ Load FSM and layout from AppContext
   ├─ Attach Shadow DOM
   ├─ Mount layout
   ├─ Load templates for all FSM states
   ├─ Render initial state template
   └─ Subscribe to FSM state changes

2. onFSMStateChange(newState)
   ├─ Update data-state attribute
   ├─ Render new template
   ├─ Setup event listeners
   └─ Setup reactive effects

3. disconnectedCallback()
   ├─ Unsubscribe from FSM
   ├─ Clean up event listeners
   └─ Cancel reactive effects
```

### Shadow DOM Structure

Each view mounts a layout to Shadow DOM:

```html
#shadow-root
├─ <style>/* injected CSS */</style>
├─ <div id="layout">
│  └─ <div id="ux-content">
│     └─ <!-- template rendered here -->
│        <button ux-event="CLICK">Action</button>
```

---

## Basic Usage

### Define a View Component

```typescript
import { ViewComponent } from '@ux3/ui';
import type { AppContext } from '@ux3/ui';

export class LoginView extends ViewComponent {
  protected layout = `<div id="layout"><div id="ux-content"></div></div>`;
  
  protected templates = new Map([
    ['idle', '<form><input type="email" ux-event="SUBMIT"></form>'],
    ['loading', '<div>Authenticating...</div>'],
    ['error', '<div>Login failed. Try again.</div>']
  ]);

  protected bindings = {
    events: [
      { element: 'form', event: 'submit', action: 'LOGIN' }
    ],
    reactive: [],
    i18n: [],
    widgets: []
  };
}

// Register as custom element
customElements.define('ux-login', LoginView);
```

### Use in HTML

```html
<!-- Bind to FSM namespace "auth" -->
<ux-login ux-fsm="auth" ux-view="login"></ux-login>
```

When the `auth` FSM transitions states (idle → loading → authenticated), the view automatically re-renders the corresponding template.

---

## Generated Components

The compiler generates ViewComponent subclasses from YAML + HTML:

```yaml
# ux/view/login.yaml
name: login
initial: idle
states:
  idle: 'view/login/idle.html'
  loading: 'view/login/loading.html'
  error: 'view/login/error.html'
```

```html
<!-- ux/view/login/idle.html -->
<form ux-event="SUBMIT">
  <input type="email" placeholder="Email" />
  <button type="submit">Login</button>
</form>
```

Generates:

```typescript
// generated/views/login.ts
export class LoginView extends ViewComponent {
  static FSM_CONFIG = { /* ... */ };
  
  protected layout = '<div id="layout">...</div>';
  
  protected templates = new Map([
    ['idle', '<!-- idle template -->'],
    ['loading', '<!-- loading template -->'],
    ['error', '<!-- error template -->']
  ]);

  protected bindings = { /* ... */ };
}
```

---

## Attribute API

### Core Attributes

| Attribute | Type | Purpose |
|-----------|------|---------|
| `ux-fsm` | string | FSM namespace (e.g., "auth", "todos") |
| `ux-view` | string | View name for template lookup |
| `ux-layout` | string | Layout name (default: "default") |

### Runtime Attributes

| Attribute | Type | Set by | Purpose |
|-----------|------|--------|---------|
| `data-state` | string | ViewComponent | Current FSM state (CSS binding) |

---

## Template Syntax

### Text Interpolation

```html
<!-- Accesses FSM context or template-local data -->
<p>{{ this.count }}</p>
<p>{{ this.user.name }}</p>
```

### Conditional Rendering

```html
<!-- ux-if shows/hides based on condition -->
<div ux-if="this.isLoading">Loading...</div>
<div ux-if="this.hasError">Error: {{ this.error }}</div>
```

### Repeating Lists

```html
<!-- ux-repeat iterates over arrays -->
<ul>
  <li ux-repeat="this.items" :item="item">
    {{ item.name }}
  </li>
</ul>
```

### Styling

```html
<!-- ux-style references style key -->
<div ux-style="card">Content</div>
<!-- Renders as: <div class="ux-style-card ...">Content</div> -->
```

### Event Binding

```html
<!-- ux-event dispatches FSM event on trigger -->
<button ux-event="SUBMIT">Submit</button>
<!-- Sends: fsm.send('SUBMIT') on click -->

<!-- With payload -->
<button ux-event="DELETE" :id="item.id">Delete</button>
<!-- Sends: fsm.send({ type: 'DELETE', id: item.id }) -->
```

---

## Binding System

### Event Bindings

```typescript
protected bindings = {
  events: [
    // Click button → dispatch CLICK event
    { element: 'button[ux-event="CLICK"]', event: 'click', action: 'CLICK' },
    // Form submit → dispatch SUBMIT event with form data
    { element: 'form', event: 'submit', action: 'SUBMIT' }
  ]
};
```

### Reactive Bindings

```typescript
protected bindings = {
  reactive: [
    // Two-way bind input to FSM context
    { element: 'input[name="email"]', property: 'value', signal: 'email' },
    // Display count from FSM context
    { element: '.counter', property: 'textContent', signal: 'count' }
  ]
};
```

### i18n Bindings

```typescript
protected bindings = {
  i18n: [
    // Insert translated text
    { element: '.greeting', key: 'home.greeting' },
    // Set ARIA labels from i18n
    { element: 'button', key: 'actions.submit', attr: 'aria-label' }
  ]
};
```

---

## Lifecycle Hooks

### connectedCallback()

Runs when element inserted into DOM:
```typescript
connectedCallback() {
  // 1. Resolve FSM and layout
  // 2. Attach Shadow DOM
  // 3. Mount layout
  // 4. Load templates
  // 5. Render initial state
  // 6. Subscribe to FSM
}
```

### disconnectedCallback()

Runs when element removed from DOM:
```typescript
disconnectedCallback() {
  // 1. Unsubscribe from FSM
  // 2. Clean up event listeners
  // 3. Cancel reactive effects
}
```

---

## Integration with FSM Context

Views access FSM context via the AppContext:

```typescript
// In a binding or template
const fsm = this.app.machines['auth'];
const context = fsm.getContext();

console.log(context.user);    // From FSM context
console.log(context.error);   // From FSM context
```

Template interpolations use FSM context as `this`:

```html
<!-- Renders: "User: Alice" -->
<p>User: {{ this.user.name }}</p>
```

---

## State Reflection

The current FSM state is reflected as `data-state` attribute:

```html
<!-- When auth FSM is in "authenticated" state -->
<ux-login data-state="authenticated"></ux-login>
```

Use CSS to style based on state:

```css
ux-login[data-state="idle"] {
  display: block;
}

ux-login[data-state="loading"] {
  opacity: 0.5;
}

ux-login[data-state="authenticated"] {
  display: none;
}
```

---

## Example: Complete Todo View

```yaml
# ux/view/todolist.yaml
initial: idle
states:
  idle:
    template: 'view/todolist/idle.html'
    on:
      LOAD: loading
  loading:
    template: 'view/todolist/loading.html'
    invoke:
      src: loadTodos
    on:
      SUCCESS: loaded
      ERROR: error
  loaded:
    template: 'view/todolist/loaded.html'
    on:
      ADD: loaded
      REMOVE: loaded
      TOGGLE: loaded
  error:
    template: 'view/todolist/error.html'
    on:
      RETRY: loading
```

```html
<!-- ux/view/todolist/loaded.html -->
<div>
  <button ux-event="LOAD">Reload</button>
  
  <ul>
    <li ux-repeat="this.todos" :todo="todo">
      <input 
        type="checkbox" 
        :checked="todo.done"
        ux-event="TOGGLE"
      />
      {{ todo.title }}
      <button ux-event="REMOVE" :id="todo.id">×</button>
    </li>
  </ul>
</div>
```

---

## Best Practices

1. **Keep templates small**: One state per template file
2. **Use FSM for complex flows**: Let state machine drive UX
3. **Bind events declaratively**: Use `ux-event` instead of imperative listeners
4. **Leverage Shadow DOM isolation**: Styles don't leak
5. **Test state transitions**: Verify all paths through FSM

---

## Reference

- Source: [src/ui/view-component.ts](src/ui/view-component.ts)
- Generated views: [examples/iam/generated/views/](examples/iam/generated/views/)
- Compiler: [src/build/view-compiler.ts](src/build/view-compiler.ts)
