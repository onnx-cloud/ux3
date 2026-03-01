# FSM Core — State Machine Architecture

## Overview

The FSM (Finite State Machine) is the heart of UX3, managing view lifecycle and transitions. It's a lightweight, deterministic engine (~300 LOC) with zero external dependencies.

**Key characteristics:**
- Declarative state definitions and transitions
- Event-driven architecture with event queue processing
- Guard conditions for conditional transitions
- Entry/exit actions for state lifecycle
- Context mutation and history tracking
- Global registry for namespaced FSM management

---

## Core Concepts

### StateMachine Class

The `StateMachine<T>` class manages state transitions and context:

```typescript
import { StateMachine } from '@ux3/fsm';

const fsm = new StateMachine({
  id: 'auth',
  initial: 'idle',
  context: { attempts: 0, user: null },
  states: {
    idle: {
      on: { LOGIN: 'authenticating' },
      entry: [(ctx) => console.log('Enter idle')]
    },
    authenticating: {
      on: {
        SUCCESS: { target: 'authenticated', actions: [(ctx, evt) => ctx.user = evt.user] },
        FAILURE: { target: 'error', guard: (ctx) => ctx.attempts < 3 }
      }
    },
    authenticated: {
      on: { LOGOUT: 'idle' },
      exit: [(ctx) => ctx.user = null]
    },
    error: {
      on: { RETRY: 'authenticating' }
    }
  }
});

// Send events
fsm.send('LOGIN');
fsm.send({ type: 'SUCCESS', user: { id: 1 } });

// Observe state changes
fsm.subscribe((state, context) => {
  console.log(`Now in ${state}`, context);
});

// Access current state and context
const state = fsm.getState();      // 'authenticating'
const ctx = fsm.getContext();      // { attempts: 0, user: { id: 1 } }
```

### State Configuration

**Short form** (simple template mapping):
```yaml
idle: 'view/auth/idle.html'
```

**Long form** (with lifecycle):
```yaml
submitting:
  on:
    SUCCESS: success
    ERROR: error
  entry: [logEntry]
  exit: [cleanup]
```

### Transitions

Transitions can be:
- **String target**: `{ on: { EVENT: 'nextState' } }`
- **Object with guard**: `{ on: { EVENT: { target: 'nextState', guard: (ctx) => ctx.count > 0 } } }`
- **With actions**: `{ on: { EVENT: { target: 'nextState', actions: [(ctx, evt) => ctx.count++] } } }`

---

## FSM Registry

The global `FSMRegistry` manages namespaced FSM instances:

```typescript
import { FSMRegistry, StateMachine } from '@ux3/fsm';

// Register FSMs
const authFsm = new StateMachine({ /* ... */ });
FSMRegistry.register('auth', authFsm);

// Lookup
const fsm = FSMRegistry.get('auth');

// Check existence
if (FSMRegistry.has('auth')) { /* ... */ }

// Get all
const all = FSMRegistry.getAll();  // Map<string, StateMachine>
```

### Namespace Convention

The registry uses dot-notation for hierarchical state references:

```
ux-state="auth.authenticated"  → extracts namespace 'auth'
ux-state="user.account.loaded" → extracts namespace 'user'
```

Views bind to FSMs via `ux-state` attributes, which map to registered namespaces.

---

## Event Handling

### Queueing & Processing

Events are queued and processed sequentially:
```typescript
fsm.send('EVENT1');  // Queued
fsm.send('EVENT2');  // Queued

// Both processed in order when FSM has time
```

#### Global Events
Some application‑level events may affect multiple machines. `FSMRegistry.broadcastGlobal(event)`
broadcasts an event to every registered FSM and notifies any global subscribers. Transitions
can listen for these using a `*` prefix:
```yaml
on:
  '*LOGOUT': idle
```

### Guard Conditions

Guards prevent unwanted transitions:
```yaml
states:
  ready:
    on:
      PROCEED:
        target: processing
        guard: (ctx) => ctx.canProceed === true
```

If guard returns false, the event is ignored and FSM remains in current state.

### Actions

Actions execute during transitions:
```typescript
states:
  idle: {
    on: {
      START: {
        target: 'running',
        actions: [
          (ctx, event) => {
            ctx.startTime = Date.now();
            console.log('Started:', event.payload);
          }
        ]
      }
    }
  }
}
```

---

## Context Management

FSM context is the state data associated with the machine:

```typescript
// Initialize with context
const fsm = new StateMachine({
  id: 'counter',
  initial: 'idle',
  context: { count: 0 },  // Or function: () => ({ count: 0 })
  states: {
    idle: { on: { INC: 'idle' } }
  }
});

// Update context
fsm.setState({ count: fsm.getContext().count + 1 });

// Or via actions
actions: [
  (ctx, event) => {
    ctx.count++;  // Mutation is allowed
  }
]
```

---

## Subscription & Observability

```typescript
// Subscribe to all state changes
const unsubscribe = fsm.subscribe((state, context) => {
  console.log(`Transitioned to ${state}`, context);
});

// Unsubscribe
unsubscribe();
```

The subscription callback receives:
- `state`: Current state name (string)
- `context`: Current context snapshot (readonly)

---

## Integration with Views

Views automatically subscribe to FSM state changes via `ux-state`:

```html
<!-- Component reflects FSM state -->
<ux-login ux-fsm="auth" ux-view="login"></ux-login>

<!-- Template swaps based on FSM state -->
<!-- Shows when auth.idle -->
<div ux-if="this.isIdle">Login form</div>

<!-- Shows when auth.authenticating -->
<div ux-if="this.isAuthenticating">Loading...</div>

<!-- Shows when auth.authenticated -->
<div ux-if="this.isAuthenticated">Welcome!</div>
```

---

## Best Practices

1. **Keep states focused**: One responsibility per state
2. **Use guards sparingly**: Complex conditions belong in actions or services
3. **Avoid side effects in constructors**: Put them in entry actions
4. **Subscribe for observability**: Log important transitions for debugging
5. **Test transitions**: Verify all paths through the FSM

---

## Examples

### Authentication Flow
```typescript
const authFsm = new StateMachine({
  id: 'auth',
  initial: 'idle',
  context: { user: null, error: null },
  states: {
    idle: {
      on: { LOGIN: 'authenticating' }
    },
    authenticating: {
      entry: [(ctx) => ctx.error = null],
      on: {
        SUCCESS: { target: 'authenticated', actions: [(ctx, e) => ctx.user = e.user] },
        FAILURE: { target: 'error', actions: [(ctx, e) => ctx.error = e.message] }
      }
    },
    authenticated: {
      on: { LOGOUT: 'idle' },
      exit: [(ctx) => ctx.user = null]
    },
    error: {
      on: { RETRY: 'authenticating' }
    }
  }
});
```

---

## Reference

- Source: [src/fsm/state-machine.ts](src/fsm/state-machine.ts)
- Registry: [src/fsm/registry.ts](src/fsm/registry.ts)
- Types: [src/fsm/types.ts](src/fsm/types.ts)
