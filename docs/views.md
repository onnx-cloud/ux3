# Views — Declarative State-Driven UI

## Overview

Views are the top-level UI containers in UX3. Each view is an FSM (state machine) that maps application states to templates. The compiler generates ViewComponent classes from YAML configuration + HTML templates, producing strongly-typed components that automatically sync with FSM state changes.

**Key characteristics:**
- Declared as YAML + HTML (not code-first)
- Automatically generated from view schemas
- One view = one FSM + layout + templates
- Event-driven interaction via `ux-event` directives
- Full type safety on FSM context and events

---

## View YAML Structure

Views are declared in `ux/view/*.yaml`:

```yaml
# ux/view/login.yaml
initial: idle

states:
  idle:
    template: 'view/login/idle.html'
    on:
      SUBMIT: submitting
  
  submitting:
    template: 'view/login/submitting.html'
    invoke:
      src: submitLogin
      input: { email: 'this.email', password: 'this.password' }
    on:
      SUCCESS: success
      ERROR: error
  
  success:
    template: 'view/login/success.html'
    on:
      CONTINUE: idle
  
  error:
    template: 'view/login/error.html'
    on:
      RETRY: idle
```

**Required:**
- `initial`: Starting state name
- `states`: Object mapping state names to templates or config

**Optional:**
- `invoke`: Service invocation on state entry
- `guard`: Conditional transition using named logic
- `actions`: array of named logic or inline functions
- `entry`/`exit`: Lifecycle actions (also reference logic)

Refer to `ux/logic/*` modules for implementations – the compiler auto‑imports
functions matching the names used here.  See the logic patterns guide for details.

---

## Template Structure

Templates are HTML files with UX3 directives:

```html
<!-- ux/view/login/idle.html -->
<form ux-event="SUBMIT">
  <fieldset>
    <label>
      Email
      <input 
        type="email" 
        name="email"
        placeholder="you@example.com"
        ux-event="CHANGE"
        :email="event.target.value"
      />
    </label>
    
    <label>
      Password
      <input 
        type="password" 
        name="password"
        ux-event="CHANGE"
        :password="event.target.value"
      />
    </label>
    
    <button type="submit">
      {{ i18n('auth.login-btn') }}
    </button>
  </fieldset>
</form>
```

---

## Template Directives

### ux-if — Conditional Rendering

```html
<!-- Show if truthy -->
<div ux-if="this.isLoading">Loading...</div>

<!-- Hide if falsy -->
<div ux-if="!this.hasError">Success!</div>
```

### ux-repeat — List Rendering

```html
<!-- Iterate array -->
<ul>
  <li ux-repeat="this.todos" :todo="todo">
    {{ todo.title }}
  </li>
</ul>

<!-- With index -->
<ol>
  <li ux-repeat="this.items" :item="item" :index="index">
    {{ index + 1 }}. {{ item.name }}
  </li>
</ol>
```

### ux-event — Event Binding

```html
<!-- Send event on trigger -->
<button ux-event="CLICK">Click me</button>

<!-- Send event with payload -->
<button ux-event="DELETE" :id="item.id">Delete</button>

<!-- Bind to form submission -->
<form ux-event="SUBMIT">
  <input name="email" />
  <!-- Sends: fsm.send({ type: 'SUBMIT', formData: {...} }) -->
</form>
```

### ux-style — CSS Classes

```html
<!-- Reference style key -->
<button ux-style="btn-primary">Submit</button>

<!-- Compiles to: -->
<!-- <button class="ux-style-btn-primary px-4 py-2 ...">Submit</button> -->
```

### Text Interpolation

```html
<!-- Access FSM context -->
<p>Hello {{ this.userName }}!</p>

<!-- Computed properties -->
<p>Total: {{ this.items.length }} items</p>

<!-- i18n with variables -->
<p>{{ i18n('greeting', { name: this.userName }) }}</p>
```

### HTML Interpolation (Triple Braces)

```html
<!-- For safe HTML (MUST be sanitized!) -->
<div>{{{ this.richHtml }}}</div>

<!-- This bypasses escaping - use carefully! -->
```

---

## Generated Components

The compiler generates ViewComponent classes:

```typescript
// generated/views/login.ts
export class LoginView extends ViewComponent {
  static FSM_CONFIG = { /* state machine config */ };
  
  protected layout = '...';
  protected templates = new Map([
    ['idle', '<form>...</form>'],
    ['submitting', '<div>Loading...</div>'],
    ['success', '<div>Success!</div>'],
    ['error', '<div>Error!</div>']
  ]);
  
  protected bindings = {
    events: [
      { element: 'form', event: 'submit', action: 'SUBMIT' }
    ],
    reactive: [],
    i18n: []
  };
}

customElements.define('ux-login', LoginView);
```

---

## Using Views in HTML

```html
<!-- Reference view component -->
<ux-login 
  ux-fsm="auth" 
  ux-view="login"
  ux-layout="auth-layout"
></ux-login>

<!-- Component automatically binds to FSM and re-renders on state changes -->
```

**Attributes:**
- `ux-fsm`: FSM namespace to bind (required)
- `ux-view`: View name for template lookup (default: FSM name)
- `ux-layout`: Layout name (default: "default")

---

## View Lifecycle

1. **Register FSM** in AppContext
2. **Insert element** in DOM
3. **Component mounts**:
   - Load FSM from AppContext
   - Attach Shadow DOM
   - Mount layout
   - Load templates for all states
   - Render initial state template
   - Subscribe to FSM changes
4. **FSM transitions**:
   - Re-render template for new state
   - Rebind event listeners
   - Update `data-state` attribute
5. **Unmount**:
   - Unsubscribe from FSM
   - Clean up listeners
   - Remove Shadow DOM

---

## State CSS Binding

The current FSM state is reflected as `data-state` attribute:

```html
<ux-login data-state="idle"></ux-login>
<ux-login data-state="submitting"></ux-login>
<ux-login data-state="success"></ux-login>
```

Use CSS to style based on state:

```css
ux-login[data-state="idle"] .form {
  display: block;
}

ux-login[data-state="submitting"] .form {
  opacity: 0.5;
  pointer-events: none;
}

ux-login[data-state="success"] {
  display: none;
}
```

---

## Best Practices

### 1. Keep States Focused

```yaml
# ✓ GOOD - Clear separation
states:
  idle: { template: 'idle.html' }
  loading: { template: 'loading.html', invoke: { src: fetch } }
  loaded: { template: 'loaded.html' }
  error: { template: 'error.html' }

# ✗ AVOID - Mixing concerns
states:
  everything: { template: 'view.html' }
```

### 2. Use Invokes for Side Effects

```yaml
# ✓ GOOD - Data loading in invoke
loading:
  invoke:
    src: loadData
  on:
    SUCCESS: loaded
    ERROR: error

# ✗ AVOID - Business logic in templates
```

### 3. Keep Templates Declarative

```html
<!-- ✓ GOOD - Declarative bindings -->
<button ux-event="DELETE" :id="item.id">Delete</button>

<!-- ✗ AVOID - Imperative code -->
<button onclick="handleDelete(item.id)">Delete</button>
```

### 4. Centralize Text

```html
<!-- ✓ GOOD - i18n keys -->
<button>{{ i18n('actions.submit') }}</button>

<!-- ✗ AVOID - Hard-coded text -->
<button>Submit</button>
```

---

## Testing Views

### Unit Testing FSM

```typescript
import { describe, it, expect } from 'vitest';
import { LoginFSM } from './login.fsm';

describe('Login FSM', () => {
  it('transitions to loading on SUBMIT', () => {
    const fsm = new LoginFSM();
    fsm.send('SUBMIT');
    expect(fsm.getState()).toBe('submitting');
  });
  
  it('guards against invalid email', () => {
    const fsm = new LoginFSM();
    fsm.setState({ email: 'invalid' });
    fsm.send('SUBMIT');
    expect(fsm.getState()).toBe('idle'); // Guard blocked transition
  });
});
```

### E2E Testing

```typescript
import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  
  // Fill form
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for success state
  await page.waitForSelector('ux-login[data-state="success"]');
  expect(await page.textContent('body')).toContain('Welcome');
});
```

---

## Troubleshooting

### View not rendering

1. Check `ux-fsm` attribute matches registered FSM
2. Verify FSM is registered in AppContext
3. Check console for errors
4. Ensure templates exist for all states

### Events not firing

1. Check `ux-event` directive syntax
2. Verify event name matches FSM `on` config
3. Check that FSM allows transition from current state
4. Look for guard conditions blocking transition

### State not updating

1. Check FSM subscription is active
2. Verify state name matches template key
3. Check for errors in invoke/actions
4. Test FSM directly: `fsm.send('EVENT')`

---

## Reference

- Compiler: [src/build/view-compiler.ts](src/build/view-compiler.ts)
- ViewComponent: [src/ui/view-component.ts](src/ui/view-component.ts)
- FSM Core: [docs/fsm-core.md](docs/fsm-core.md)
- Example: [examples/iam/ux/view/](examples/iam/ux/view/)
- Validator: [src/build/validator.ts](src/build/validator.ts)