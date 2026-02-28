# Reactive State — Signal-Based Reactivity

## Overview

UX3 provides lightweight reactive state management using a Proxy-based signal model (~1KB gzipped). Inspired by Solid.js, it offers automatic dependency tracking with zero external dependencies.

**Key features:**
- Fine-grained reactivity with automatic dependency tracking
- Proxy-based property access observation
- `effect()` for side-effect subscriptions
- `computed()` for derived state
- `batch()` for batching updates
- Native browser APIs only

---

## Core Concepts

### reactive() — Create Reactive Object

```typescript
import { reactive } from '@ux3/state';

const state = reactive({
  count: 0,
  user: { name: 'Alice', age: 30 },
  todos: [{ id: 1, done: false }]
});

// Access triggers tracking
console.log(state.count);        // 0
console.log(state.user.name);    // 'Alice'
console.log(state.todos[0].done); // false
```

### effect() — Subscribe to Changes

```typescript
import { effect } from '@ux3/state';

effect(() => {
  // This runs whenever accessed properties change
  console.log(`Count is: ${state.count}`);
  console.log(`User: ${state.user.name}`);
});

// Triggers effect
state.count = 1;      // logs: "Count is: 1"
state.user.name = 'Bob'; // logs: "User: Bob"
```

### computed() — Derived State

```typescript
import { computed } from '@ux3/state';

const doubled = computed(() => state.count * 2);

effect(() => {
  console.log(`Doubled: ${doubled()}`);
});

state.count = 5; // logs: "Doubled: 10"
```

### batch() — Batch Updates

```typescript
import { batch } from '@ux3/state';

// Debounce multiple updates into one effect run
batch(() => {
  state.count++;
  state.user.age++;
  state.todos.push({ id: 2, done: true });
});

// All effects run once after batch completes
```

---

## How It Works

### Automatic Dependency Tracking

Reactivity works by tracking property accesses within effects:

```typescript
const state = reactive({ a: 1, b: 2, c: 3 });

effect(() => {
  // This effect subscribes to changes on `a` and `b`
  console.log(state.a + state.b);
  
  // `c` is never accessed, so changes to `c` don't trigger this effect
});

state.a = 10;  // Triggers effect
state.b = 20;  // Triggers effect
state.c = 30;  // Does NOT trigger effect
```

### Proxy-Based Implementation

The reactive proxy intercepts:
- **get**: Tracks which effect is accessing which property
- **set**: Notifies all effects subscribed to that property

```typescript
const handler = {
  get(target, prop) {
    // Track: currentEffect is now interested in `prop`
    if (trackingContext.currentEffect) {
      subscribers[prop].add(trackingContext.currentEffect);
    }
    return target[prop];
  },
  
  set(target, prop, value) {
    // Notify: all effects watching `prop`
    subscribers[prop].forEach(effect => queueEffect(effect));
    return Reflect.set(target, prop, value);
  }
};
```

### Nested Object Reactivity

Reactive proxies automatically proxy nested objects:

```typescript
const state = reactive({
  user: { profile: { avatar: 'default.png' } }
});

effect(() => {
  console.log(state.user.profile.avatar);
});

// Both trigger the effect:
state.user.profile.avatar = 'new.png';
state.user = { profile: { avatar: 'other.png' } };
```

---

## Usage Patterns

### UI State Management

```typescript
import { reactive, effect } from '@ux3/state';

const appState = reactive({
  isLoading: false,
  items: [],
  error: null
});

// Auto-update UI when state changes
effect(() => {
  if (appState.isLoading) {
    document.body.classList.add('loading');
  } else {
    document.body.classList.remove('loading');
  }
});

// Fetch data
appState.isLoading = true;
fetch('/api/items')
  .then(r => r.json())
  .then(data => {
    appState.items = data;
    appState.isLoading = false;
  })
  .catch(err => {
    appState.error = err.message;
    appState.isLoading = false;
  });
```

### Form Validation

```typescript
const form = reactive({
  email: '',
  password: '',
  errors: {}
});

const isValid = computed(() => {
  return form.email.includes('@') && form.password.length >= 8;
});

effect(() => {
  if (!form.email.includes('@')) {
    form.errors.email = 'Invalid email';
  } else {
    delete form.errors.email;
  }
});

effect(() => {
  if (form.password.length < 8) {
    form.errors.password = 'Min 8 characters';
  } else {
    delete form.errors.password;
  }
});
```

### Data Synchronization

```typescript
const cache = reactive({ data: null });

// Sync with server
effect(async () => {
  if (cache.data) {
    await fetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify(cache.data)
    });
  }
});

// User edits trigger sync
cache.data = { name: 'Updated' };
```

---

## API Reference

### reactive(target: T): T

Creates a reactive proxy of an object.

```typescript
const state = reactive({ count: 0 });
```

### effect(fn: () => void): () => void

Runs `fn` whenever accessed reactive properties change. Returns cleanup function.

```typescript
const cleanup = effect(() => {
  console.log(state.count);
});

// Stop tracking
cleanup();
```

### computed<T>(fn: () => T): () => T

Returns a function that computes and caches derived state.

```typescript
const sum = computed(() => state.a + state.b);
console.log(sum()); // Cached result
```

### batch(fn: () => void): void

Batches multiple state updates to run effects only once.

```typescript
batch(() => {
  state.a++;
  state.b++;
});
// Effects run once after batch
```

---

## Performance Considerations

1. **Fine-grained tracking**: Only affected effects re-run
2. **No global re-renders**: Avoid React-style full-app re-renders
3. **Lazy evaluation**: Computed values only re-evaluate when deps change
4. **Batch for perf**: Use `batch()` when making many simultaneous changes

---

## Integration with Views

Reactive state integrates with UX3 views via FSM context:

```typescript
const fsm = new StateMachine({
  id: 'todos',
  initial: 'idle',
  context: reactive({ items: [], filter: 'all' }),
  states: {
    idle: {
      on: { TOGGLE: 'idle' }
    }
  }
});

effect(() => {
  // Update UI whenever items or filter changes
  const filtered = fsm.getContext().items.filter(/* ... */);
  console.log('Filtered:', filtered);
});
```

---

## Best Practices

1. **Keep effects pure**: Avoid side effects in other side effects
2. **Use computed for expensive operations**: Cache derived state
3. **Batch writes**: Use `batch()` for multiple updates
4. **Cleanup in effects**: Return cleanup function if needed
5. **Avoid over-tracking**: Access only what you need in effects

---

## Reference

- Source: [src/state/reactive.ts](src/state/reactive.ts)
- Examples: [examples/todo/app.ts](examples/todo/app.ts)
