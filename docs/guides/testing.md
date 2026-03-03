# Testing Complete Guide

This guide consolidates UX3 testing best practices. The framework supports unit tests (Vitest), integration tests, end-to-end tests (Playwright), and declarative scenario tests.

## Overview

UX3 uses **Vitest** for unit/integration testing and **Playwright** for E2E testing:

- **Unit tests** — FSMs, services, validators in isolation
- **Integration tests** — FSM + service interactions
- **E2E tests** — Full application in browser
- **Declarative tests** — Scenario-based YAML tests

## Section 1: Unit Testing FSMs

### Setup

All FSM tests should start with registry cleanup:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { FSMRegistry } from '@ux3/fsm/registry';
import { StateMachine } from '@ux3/fsm/state-machine';

describe('UserProfileFSM', () => {
  beforeEach(() => {
    FSMRegistry.clear(); // Reset state between tests
  });

  // Tests here...
});
```

### Testing State Transitions

Test that events trigger correct transitions:

```typescript
it('transitions from idle to loading on LOAD event', () => {
  const fsm = new StateMachine({
    name: 'profile',
    initial: 'idle',
    states: {
      idle: {
        on: { LOAD: 'loading' }
      },
      loading: {}
    }
  });

  expect(fsm.state).toBe('idle');
  fsm.send({ type: 'LOAD' });
  expect(fsm.state).toBe('loading');
});
```

### Testing Context Updates

Verify that actions update FSM context:

```typescript
it('saves user data on SUCCESS event', () => {
  const fsm = new StateMachine({
    name: 'profile',
    initial: 'loading',
    context: { user: null, error: null },
    states: {
      loading: {
        on: {
          SUCCESS: {
            target: 'loaded',
            actions: [
              (ctx, event) => {
                ctx.user = event.payload.user;
                ctx.error = null;
              }
            ]
          }
        }
      },
      loaded: {}
    }
  });

  const user = { id: '123', name: 'Alice' };
  fsm.send({ type: 'SUCCESS', payload: { user } });
  
  expect(fsm.state).toBe('loaded');
  expect(fsm.context.user).toEqual(user);
  expect(fsm.context.error).toBeNull();
});
```

### Testing Guards

Verify conditional transitions:

```typescript
it('only allows retry when attempts remain', () => {
  const fsm = new StateMachine({
    name: 'upload',
    initial: 'error',
    context: { attempts: 3, maxAttempts: 5 },
    states: {
      error: {
        on: {
          RETRY: {
            target: 'uploading',
            guard: (ctx) => ctx.attempts < ctx.maxAttempts
          }
        }
      },
      uploading: {
        on: {
          ERROR: {
            target: 'error',
            actions: [(ctx) => ctx.attempts++]
          }
        }
      }
    }
  });

  // First 2 retries should work
  for (let i = 0; i < 2; i++) {
    expect(fsm.can({ type: 'RETRY' })).toBe(true);
    fsm.send({ type: 'RETRY' });
    fsm.send({ type: 'ERROR' });
  }

  // Once max reached, RETRY should be blocked
  expect(fsm.can({ type: 'RETRY' })).toBe(false);
});
```

### Testing Invoke/Services

Mock services and verify invocation:

```typescript
import { vi } from 'vitest';

const mockUserService = {
  getUser: vi.fn(async (id: string) => ({
    user: { id, name: 'Test User' }
  }))
};

it('invokes service and transitions on SUCCESS', async () => {
  const fsm = new StateMachine({
    name: 'profile',
    initial: 'loading',
    context: { user: null },
    invokeHandlers: {
      'user.getUser': mockUserService.getUser
    },
    states: {
      loading: {
        invoke: {
          src: 'user.getUser',
          params: ['123']
        },
        on: {
          SUCCESS: {
            target: 'loaded',
            actions: [(ctx, event) => ctx.user = event.payload.user]
          },
          ERROR: 'error'
        }
      },
      loaded: {},
      error: {}
    }
  });

  // Wait for invoke to complete
  await new Promise(resolve => {
    const unsub = fsm.subscribe(() => {
      if (fsm.state === 'loaded') {
        unsub();
        resolve(null);
      }
    });
  });

  expect(mockUserService.getUser).toHaveBeenCalledWith('123');
  expect(fsm.state).toBe('loaded');
  expect(fsm.context.user).toEqual({ id: '123', name: 'Test User' });
});
```

## Section 2: Integration Testing

### Testing Multi-FSM Flows

Test parent/child FSM interactions:

```typescript
it('parent FSM coordinates child FSMs', async () => {
  const parentFSM = new StateMachine({
    name: 'app',
    initial: 'idle',
    context: { authFSM: null, profileFSM: null },
    states: {
      idle: {
        on: { LOGIN: 'authenticating' }
      },
      authenticating: {
        invoke: {
          src: 'auth.login',
          params: ['user@example.com', 'password']
        },
        on: {
          SUCCESS: {
            target: 'authenticated',
            actions: [
              (ctx, event) => {
                // Create child FSMs after auth
                ctx.authToken = event.payload.token;
              }
            ]
          },
          ERROR: 'idle'
        }
      },
      authenticated: {}
    }
  });

  parentFSM.send({ type: 'LOGIN' });
  
  // Wait for async completion
  await new Promise(resolve => {
    const unsub = parentFSM.subscribe(() => {
      if (parentFSM.state === 'authenticated') {
        unsub();
        resolve(null);
      }
    });
  });

  expect(parentFSM.context.authToken).toBeDefined();
});
```

### Testing Service Chains

Test sequential service calls:

```typescript
it('loads user then their posts', async () => {
  const mockServices = {
    'user.getProfile': vi.fn(async () => ({
      user: { id: '123', name: 'Alice' }
    })),
    'posts.getUserPosts': vi.fn(async (userId: string) => ({
      posts: [{ id: '1', title: 'Post 1' }]
    }))
  };

  const fsm = new StateMachine({
    name: 'feed',
    initial: 'loadingUser',
    context: { user: null, posts: null },
    invokeHandlers: mockServices,
    states: {
      loadingUser: {
        invoke: {
          src: 'user.getProfile'
        },
        on: {
          SUCCESS: {
            target: 'loadingPosts',
            actions: [(ctx, event) => ctx.user = event.payload.user]
          }
        }
      },
      loadingPosts: {
        invoke: {
          src: 'posts.getUserPosts',
          params: [fsm.context.user?.id]
        },
        on: {
          SUCCESS: {
            target: 'ready',
            actions: [(ctx, event) => ctx.posts = event.payload.posts]
          }
        }
      },
      ready: {}
    }
  });

  // Wait for both invokes
  await new Promise(resolve => {
    const unsub = fsm.subscribe(() => {
      if (fsm.state === 'ready') {
        unsub();
        resolve(null);
      }
    });
  });

  expect(mockServices['posts.getUserPosts']).toHaveBeenCalledWith('123');
});
```

## Section 3: Service Testing

### Testing HTTP Services

Mock fetch and verify correct calls:

```typescript
import { vi } from 'vitest';

it('calls correct endpoint and returns data', async () => {
  const mockFetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ id: '123', name: 'Test' })
  }));
  
  global.fetch = mockFetch;

  const userService = {
    async getUser(id: string) {
      const resp = await fetch(`/api/users/${id}`);
      if (!resp.ok) return { error: { message: 'Failed' } };
      return { user: await resp.json() };
    }
  };

  const result = await userService.getUser('123');

  expect(mockFetch).toHaveBeenCalledWith('/api/users/123');
  expect(result.user).toEqual({ id: '123', name: 'Test' });
});
```

### Testing Error Handling in Services

Verify error responses:

```typescript
it('returns error object on HTTP failure', async () => {
  const mockFetch = vi.fn(async () => ({
    ok: false,
    status: 404,
    statusText: 'Not Found'
  }));
  
  global.fetch = mockFetch;

  const result = await userService.getUser('nonexistent');

  expect(result.error).toBeDefined();
  expect(result.error.code).toBe('HTTP_ERROR');
  expect(result.error.statusCode).toBe(404);
});
```

### Testing Service Validation

Test input validation before API calls:

```typescript
it('validates email format before sending', async () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  const service = {
    async register(email: string, password: string) {
      if (!email.includes('@')) {
        return { error: { code: 'INVALID_EMAIL' } };
      }
      // Only call API if validation passes
      const resp = await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      return { user: await resp.json() };
    }
  };

  const result = await service.register('invalid-email', 'password');

  expect(result.error?.code).toBe('INVALID_EMAIL');
  expect(mockFetch).not.toHaveBeenCalled();
});
```

## Section 4: View Testing

### Testing View Rendering

Render views and verify output:

```typescript
import { render, screen } from '@testing-library/dom';
import { ViewComponent } from '@ux3/ui/view-component';

it('renders loaded view with data', async () => {
  const view = new ViewComponent({
    name: 'profile',
    template: `
      <div>
        <h1>{{user.name}}</h1>
        <p>{{user.email}}</p>
      </div>
    `,
    context: {
      user: { name: 'Alice', email: 'alice@example.com' }
    }
  });

  const container = document.createElement('div');
  view.render(container);

  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('alice@example.com')).toBeInTheDocument();
});
```

### Testing Conditional Rendering

Verify `ux-if` and `ux-each`:

```typescript
it('shows error state when error exists', () => {
  const view = new ViewComponent({
    name: 'post',
    template: `
      <div ux-if="!error" class="content">Post loaded</div>
      <div ux-if="error" class="error">{{error.message}}</div>
    `,
    context: { error: null }
  });

  const container = document.createElement('div');
  view.render(container);
  
  expect(container.querySelector('.content')).toBeInTheDocument();
  expect(container.querySelector('.error')).not.toBeInTheDocument();

  // Update context
  view.context.error = { message: 'Failed to load' };
  view.update();

  expect(container.querySelector('.content')).not.toBeInTheDocument();
  expect(container.querySelector('.error')).toBeInTheDocument();
});

it('renders list items with ux-each', () => {
  const view = new ViewComponent({
    name: 'userList',
    template: `
      <ul>
        <li ux-each="user in users">{{user.name}}</li>
      </ul>
    `,
    context: {
      users: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ]
    }
  });

  const container = document.createElement('div');
  view.render(container);

  const items = container.querySelectorAll('li');
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent('Alice');
  expect(items[1]).toHaveTextContent('Bob');
});
```

## Section 5: End-to-End Testing (Playwright)

### Setup

E2E tests run the full app in a browser. Configure in `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
```

### Testing User Flows

```typescript
import { test, expect } from '@playwright/test';

test('user can login and view profile', async ({ page }) => {
  // Navigate to login
  await page.goto('/login');
  
  // Fill form
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  await page.waitForURL('/dashboard');
  
  // Verify content
  expect(await page.textContent('h1')).toContain('Dashboard');
});
```

### Testing Error States

```typescript
test('shows error message on login failure', async ({ page }) => {
  await page.goto('/login');
  
  // Enter wrong credentials
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');
  
  // Verify error appears
  const error = await page.locator('[role="alert"]');
  await expect(error).toContainText('Invalid credentials');
});
```

### Testing Dynamic Content

```typescript
test('loads more posts on scroll', async ({ page }) => {
  await page.goto('/feed');
  
  // Initial load
  let items = await page.locator('[data-test="post-item"]').count();
  expect(items).toBeGreaterThan(0);
  
  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  
  // Wait for more items
  await page.waitForTimeout(500);
  const newItems = await page.locator('[data-test="post-item"]').count();
  expect(newItems).toBeGreaterThan(items);
});
```

## Section 6: Testing Best Practices

### Isolation: Reset State Between Tests

Always clear FSM registry and mocks:

```typescript
beforeEach(() => {
  FSMRegistry.clear();
  vi.clearAllMocks();
});
```

### Naming: Describe What You're Testing

```typescript
// Good
describe('UserProfile FSM', () => {
  it('transitions from idle to loading when LOAD event is sent', () => {});
  it('saves user data on SUCCESS and transitions to loaded', () => {});
});

// Avoid
describe('FSM', () => {
  it('works', () => {});
});
```

### Assertions: Be Specific

```typescript
// Good
expect(fsm.state).toBe('loaded');
expect(fsm.context.user.id).toBe('123');
expect(mockFetch).toHaveBeenCalledWith('/api/users/123');

// Avoid
expect(fsm).toBeTruthy();
expect(fsm.context).toBeDefined();
```

### Async: Always Await Invokes

```typescript
it('handles async invoke', async () => {
  fsm.send({ type: 'LOAD' });
  
  // Wait for state to change
  await new Promise(resolve => {
    const unsub = fsm.subscribe(() => {
      if (fsm.state === 'loaded') {
        unsub();
        resolve(null);
      }
    });
  });
  
  expect(fsm.state).toBe('loaded');
});
```

### Mocking: Use Factories for Services

```typescript
function createMockUserService(overrides = {}) {
  return {
    getUser: vi.fn(async (id) => ({ user: { id, name: 'Test' } })),
    ...overrides
  };
}

it('calls getUser', async () => {
  const mockService = createMockUserService();
  // Use mockService...
});
```

## Section 7: Running Tests

### Run All Tests
```bash
npm run test
```

### Run Specific Test File
```bash
npm run test -- tests/fsm/user-profile.test.ts
```

### Run in Watch Mode
```bash
npm run test:watch
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Debug E2E Tests
```bash
npm run test:e2e:debug
```

### View Coverage
```bash
npm run test
# Coverage in test-results/vitest/coverage/index.html
```

## Checklist: Comprehensive Test Suite

Before shipping features:

- [ ] **Unit tests for FSMs** — All states, transitions, guards tested
- [ ] **Unit tests for services** — HTTP calls, error handling, validation
- [ ] **Unit tests for validators** — Schema validation, custom rules
- [ ] **Integration tests** — FSM + service flows
- [ ] **View tests** — Rendering, conditional logic, lists
- [ ] **E2E tests** — Critical user flows (login, create, delete)
- [ ] **Error paths tested** — Not just happy paths
- [ ] **Tests isolated** — No shared state between tests
- [ ] **Mocks clear** — Services properly mocked
- [ ] **Async handled** — All awaits and promises handled
- [ ] **Coverage > 80%** — Overall test coverage target
- [ ] **Tests passing** — CI should not merge without passing tests

## Related

- [IAM Example Tests](../examples/iam/README.md) — Reference implementation
- [Vitest Documentation](https://vitest.dev) — Unit test framework
- [Playwright Documentation](https://playwright.dev) — E2E test framework
- [Error Handling Patterns](./patterns/error-handling.md) — Testing error states
- [Data Fetching Patterns](./patterns/data-fetching.md) — Testing async data
