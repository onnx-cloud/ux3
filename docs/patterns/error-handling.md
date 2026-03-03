# Error Handling Patterns

This guide covers strategies for building robust error handling in UX3 applications. Errors are inevitable in real-world applications—network failures, validation errors, unexpected data shapes, and service outages all require thoughtful recovery strategies.

## Overview

UX3 provides error handling at multiple layers:

1. **FSM-level errors** — State-based recovery strategies
2. **Service errors** — Network failures, timeouts, invalid responses
3. **Validation errors** — Form validation, schema validation
4. **Global error boundaries** — Unhandled rejections, fatal errors

## Principle 1: Error as State, Not Exception

In UX3, errors are **first-class states** in your FSM, not exceptions to be thrown. This is intentional:

✅ **Good**: Design error states and transitions
```yaml
states:
  loading:
    invoke:
      src: fetchUserData
    on:
      SUCCESS: { target: loaded, actions: [saveUser] }
      ERROR: { target: error, actions: [logError] }
  
  error:
    on:
      RETRY: loading
      DISMISS: idle
```

❌ **Avoid**: Throwing exceptions in service callbacks
```typescript
// Don't: exceptions in services bypass FSM
export const userService = {
  async getUser(id: string) {
    if (!id) throw new Error('ID required');  // FSM doesn't see this
    return fetch(`/api/users/${id}`);
  }
};
```

## Principle 2: Structured Error Context

Pass error details through FSM context so view FSMs can display meaningful messages:

**Service Definition** (in `src/services/user.ts`):
```typescript
export interface ApiError {
  code: string;
  message: string;
  statusCode?: number;
  details?: Record<string, any>;
}

export const userService = {
  async fetchUser(id: string): Promise<{ user?: any, error?: ApiError }> {
    try {
      const resp = await fetch(`/api/users/${id}`);
      if (!resp.ok) {
        return {
          error: {
            code: 'HTTP_ERROR',
            message: `HTTP ${resp.status}: ${resp.statusText}`,
            statusCode: resp.status,
          }
        };
      }
      const user = await resp.json();
      return { user };
    } catch (cause) {
      return {
        error: {
          code: 'NETWORK_ERROR',
          message: `Network failed: ${cause instanceof Error ? cause.message : 'Unknown'}`,
          details: { cause }
        }
      };
    }
  }
};
```

**View FSM** (in `ux/view/user-profile/profile.yaml`):
```yaml
name: profile
initial: idle
context:
  user: null
  error: null  # Store error details
  retryCount: 0

states:
  idle:
    on:
      LOAD: loading

  loading:
    invoke:
      src: user.fetchUser
      params: [ctx.userId]
    on:
      SUCCESS:
        target: loaded
        actions:
          - assign: { user: event.payload.user, error: null, retryCount: 0 }
      ERROR:
        target: error
        actions:
          - assign: { error: event.payload.error, retryCount: ctx.retryCount + 1 }

  loaded:
    on:
      LOGOUT: idle

  error:
    on:
      RETRY:
        target: loading
        guard: ctx.retryCount < 3  # Max 3 retries
      DISMISS: idle
```

**View Template** (in `profile.html`):
```html
<div class="profile-container">
  <div ux-if="!ctx.user && !ctx.error" class="loading">
    Loading...
  </div>
  
  <div ux-if="ctx.user" class="profile">
    <h1>{{ctx.user.name}}</h1>
    <p>{{ctx.user.email}}</p>
  </div>
  
  <div ux-if="ctx.error" class="error-box" role="alert">
    <h2>Failed to Load Profile</h2>
    <p>{{ctx.error.message}}</p>
    <p ux-if="ctx.error.code === 'NETWORK_ERROR'" class="hint">
      This appears to be a network issue. <button @click="RETRY">Try again</button>
    </p>
    <p ux-if="ctx.error.statusCode === 404" class="hint">
      The user profile could not be found.
    </p>
    <button @click="DISMISS">Go back</button>
    <p ux-if="ctx.retryCount > 0" class="meta">
      (Attempt {{ctx.retryCount}} of 3)
    </p>
  </div>
</div>
```

## Pattern 1: Retry with Exponential Backoff

For transient errors (network timeouts, rate limits), implement retry logic with exponential delays:

```typescript
// In src/services/user.ts
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const userService = {
  async fetchUserWithRetry(
    id: string,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const resp = await fetch(`/api/users/${id}`);
        if (resp.ok) {
          return { user: await resp.json() };
        }
        
        // Retry on 5xx errors and 429 (rate limit)
        if (resp.status >= 500 || resp.status === 429) {
          if (attempt < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, attempt);
            await sleep(delay);
            continue;
          }
        }
        
        // Don't retry on 4xx (client errors)
        return {
          error: {
            code: 'HTTP_ERROR',
            statusCode: resp.status,
            message: `HTTP ${resp.status}`,
          }
        };
      } catch (cause) {
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
        
        return {
          error: {
            code: 'NETWORK_ERROR',
            message: `Network failed after ${attempt + 1} attempts`,
            details: { cause }
          }
        };
      }
    }
  }
};
```

**In view FSM**:
```yaml
states:
  loading:
    invoke:
      src: user.fetchUserWithRetry
      params: [ctx.userId, 3, 1000]
    on:
      SUCCESS: { target: loaded, actions: [assign: { user: event.payload.user }] }
      ERROR: { target: error, actions: [assign: { error: event.payload.error }] }

  error:
    on:
      RETRY: loading
      DISMISS: idle
```

## Pattern 2: Fallback UI

When data fetch fails, use cached or default data instead of blocking:

```yaml
name: dashboard
initial: idle
context:
  data: null
  dataAge: null  # Timestamp of last successful fetch
  error: false
  useCache: false  # Flag: showing cached data

states:
  idle:
    on:
      LOAD: fetching

  fetching:
    invoke:
      src: dashboard.fetchDashboard
    on:
      SUCCESS:
        target: ready
        actions:
          - assign:
              data: event.payload.data
              dataAge: event.payload.timestamp
              error: false
              useCache: false

      ERROR:
        target: ready  # Still show UI with cached data
        actions:
          - assign:
              error: true
              useCache: ctx.data !== null
              # data stays as-is (cached)

  ready:
    on:
      REFRESH: fetching
      CLEAR_CACHE: idle
```

**Template**:
```html
<div class="dashboard">
  <div ux-if="ctx.error && ctx.useCache" class="warning-banner">
    ⚠ Showing cached data from {{ctx.dataAge | formatTime}}
    <button @click="REFRESH">Refresh now</button>
  </div>
  
  <div ux-if="ctx.error && !ctx.useCache" class="empty-state">
    No data available. Please try again later.
    <button @click="REFRESH">Retry</button>
  </div>
  
  <div ux-if="!ctx.error" class="content">
    <!-- Render ctx.data -->
  </div>
</div>
```

## Pattern 3: Validation Errors

Form validation produces multiple errors that should guide user correction:

**View FSM** (in `ux/view/auth/register.yaml`):
```yaml
name: register
initial: idle
context:
  form:
    email: ''
    password: ''
    confirmPassword: ''
  errors: {}  # { email: [error list], password: [...], ... }
  submitting: false
  submitError: null

states:
  idle:
    on:
      CHANGE_EMAIL:
        actions:
          - assign: { 'form.email': event.value }
      CHANGE_PASSWORD:
        actions:
          - assign: { 'form.password': event.value }
      SUBMIT: validating

  validating:
    invoke:
      src: auth.validateRegister
      params: [ctx.form]
    on:
      SUCCESS:
        target: submitting
        actions:
          - assign: { errors: {} }
      ERROR:
        target: idle
        actions:
          - assign: { errors: event.payload.errors }

  submitting:
    invoke:
      src: auth.register
      params: [ctx.form]
    on:
      SUCCESS:
        target: registered
      ERROR:
        target: idle
        actions:
          - assign: { submitError: event.payload.message }
```

**Validation service** (in `src/services/auth.ts`):
```typescript
export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export const auth = {
  async validateRegister(form: any) {
    const errors: Record<string, ValidationError[]> = {};
    
    // Email validation
    if (!form.email) {
      errors.email ||= [];
      errors.email.push({ field: 'email', code: 'REQUIRED', message: 'Email is required' });
    } else if (!isValidEmail(form.email)) {
      errors.email ||= [];
      errors.email.push({ field: 'email', code: 'INVALID_EMAIL', message: 'Enter a valid email' });
    }
    
    // Password validation
    if (!form.password) {
      errors.password ||= [];
      errors.password.push({ field: 'password', code: 'REQUIRED', message: 'Password is required' });
    } else if (form.password.length < 8) {
      errors.password ||= [];
      errors.password.push({ field: 'password', code: 'TOO_SHORT', message: 'Password must be 8+ characters' });
    }
    
    // Confirm password
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword ||= [];
      errors.confirmPassword.push({ field: 'confirmPassword', code: 'MISMATCH', message: 'Passwords do not match' });
    }
    
    if (Object.keys(errors).length) {
      return { errors };
    }
    
    return { errors: {} };
  }
};
```

**Template** (in `register.html`):
```html
<form @submit="SUBMIT">
  <div class="form-group">
    <label for="email">Email</label>
    <input
      id="email"
      type="email"
      value="{{ctx.form.email}}"
      @input="CHANGE_EMAIL"
      aria-invalid="{{bool(ctx.errors.email)}}"
    />
    <div ux-if="ctx.errors.email" class="errors" role="alert">
      <p ux-each="error in ctx.errors.email">{{error.message}}</p>
    </div>
  </div>
  
  <div class="form-group">
    <label for="password">Password</label>
    <input
      id="password"
      type="password"
      value="{{ctx.form.password}}"
      @input="CHANGE_PASSWORD"
      aria-invalid="{{bool(ctx.errors.password)}}"
    />
    <div ux-if="ctx.errors.password" class="errors" role="alert">
      <p ux-each="error in ctx.errors.password">{{error.message}}</p>
    </div>
  </div>
  
  <button type="submit" disabled="{{ctx.submitting}}">Register</button>
  
  <div ux-if="ctx.submitError" class="error-banner" role="alert">
    {{ctx.submitError}}
  </div>
</form>
```

## Pattern 4: Global Error Boundary

Catch unhandled promise rejections and FSM errors at the app level:

```typescript
// In src/main.ts or app initialization
import { AppContext, AppLifecyclePhase } from '@ux3/core';

const app = new AppContext();

// Listen for fatal errors
app.hooks.on(AppLifecyclePhase.ERROR, async (context) => {
  const { error, fsm } = context;
  
  console.error('Uncaught error:', error);
  
  // Option 1: Log and notify user
  if (navigator.onLine === false) {
    // Offline
    showNotification('You appear to be offline', 'warning');
  } else {
    // Online but app error
    showNotification('An unexpected error occurred. Please refresh.', 'error');
  }
  
  // Option 2: Send to error tracking service
  await sendErrorReport({
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    fsm: fsm?.name,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Could dispatch to an error FSM or boundary
  event.preventDefault();
});

await app.start();
```

## Pattern 5: Streaming Error Context

For complex operations, stream error context through parent → child FSMs:

**Parent FSM** (loading data for multiple child views):
```yaml
name: mainApp
initial: loading
context:
  users: null
  posts: null
  error: null  # Shared error context

states:
  loading:
    invoke:
      src: app.loadInitialData
    on:
      SUCCESS:
        target: ready
        actions:
          - assign: { users: event.payload.users, posts: event.payload.posts }
      ERROR:
        target: error
        actions:
          - assign: { error: event.payload }

  error:
    # Create sub-FSM views that inherit this.ctx.error
    on:
      RETRY: loading
```

**Child View FSM** (in `ux/view/user-list.yaml`):
```yaml
name: userList
initial: idle
context:
  items: null

states:
  idle:
    # Access parent error via `parent.error`
    template: |
      <div ux-if="parent.error">
        <p class="error">{{parent.error.message}}</p>
      </div>
      <ul>
        <li ux-each="user in parent.users">{{user.name}}</li>
      </ul>
```

## Checklist: Error Handling Design

Before shipping a feature, ensure:

- [ ] **State-based errors** — Error is a state, not an exception
- [ ] **Structured context** — Error object has code, message, and details
- [ ] **User-friendly messages** — Messages explain what happened and next steps
- [ ] **Retry strategy** — Clear when/how to retry (exponential backoff if needed)
- [ ] **Fallback UI** — Graceful degradation when data unavailable
- [ ] **Error logging** — Errors sent to observability backend
- [ ] **Testing** — Error paths tested as thoroughly as success paths
- [ ] **Loading states** — Distinguish between loading, error, and empty states
- [ ] **Offline handling** — App behaves sensibly without network
- [ ] **Global boundary** — Unhandled errors don't crash entire app

## Related

- [Services documentation](../services.md) — How to invoke services
- [Testing guides](../testing-guides.md) — Testing error paths
- [State machines](../fsm-core.md) — FSM design patterns
