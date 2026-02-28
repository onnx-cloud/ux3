# IAM Test Suite

Unit and integration tests for the IAM example application covering FSM transitions, view rendering, event handling, and end-to-end flows.

## Overview

The test suite is organized into four main test files:

### 1. `fsms.test.ts` – FSM Transitions
Tests for all IAM finite state machines covering initialization, state transitions, and context management.

**Coverage:**
- **Auth FSM** (8 tests)
  - Initialization in `idle` state
  - `LOGIN` transition to `submitting`
  - `SUCCESS` transition to `success`
  - `FAILURE` transition to `error`
  - `RETRY` transition back to `idle`
  - Invalid event handling
  - Context tracking (credentials, tokens)
  - Subscriber notifications

- **Account FSM** (8 tests)
  - Loading state lifecycle
  - Transitions: `loading` → `viewing` → `editing` → `saving`
  - `CANCEL` preservation of context
  - `FAILURE` handling in `saving` state
  - Full edit cycle: view → edit → save → view

- **Chat FSM** (6 tests)
  - Idle initialization
  - Connection flow: `idle` → `loading` → `connected`
  - Messaging in `connected` state
  - Disconnect transition
  - Subscriber lifecycle
  - Connection failure and retry

- **Dashboard FSM** (5 tests)
  - Idle initialization
  - `LOAD` transition to `loading`
  - Load success/failure handling
  - Reload capability
  - Error state recovery

- **Market FSM** (5 tests)
  - Idle initialization
  - `FILTER` without state change
  - View trigger: `idle` → `loading` → `loaded`
  - Reload from `loaded` state
  - Context updates with filters

**Run:**
```bash
npm test -- fsms.test.ts
```

### 2. `rendering.test.ts` – View Rendering
Tests for view component rendering, template swapping, and state-driven visibility.

**Coverage:**
- **Login View**
  - Renders idle state template (form)
  - Updates template on FSM transitions
  - Reflects FSM state as `data-state` attribute
  - Transitions through success/error states

- **Dashboard View**
  - Renders idle, loading, and loaded templates
  - Handles error state rendering
  - Updates DOM on state changes

- **Account View**
  - Renders viewing and editing states
  - Preserves unsaved changes during cancel
  - Form rendering in editing state
  - Context synchronization

- **Chat View**
  - Idle, loading, and connected templates
  - Chat content rendering
  - Disconnect state handling

- **Market View**
  - Data display in loaded state
  - Filter application
  - Template swapping on transitions

**Tests:**
- ✅ Template loading and rendering
- ✅ State-driven template selection
- ✅ data-state attribute reflection (CSS binding)
- ✅ DOM updates on FSM transitions
- ✅ Layout application

**Run:**
```bash
npm test -- rendering.test.ts
```

### 3. `events.test.ts` – Event Binding
Tests for event binding, delegation, payload handling, and validation.

**Coverage:**
- **ux-event Directive**
  - Form SUBMIT binding
  - Button CLICK binding
  - Multiple event bindings
  - Custom events with payloads

- **Event Dispatch**
  - LOGIN, EDIT, SAVE events
  - Chat CONNECT and SEND_MESSAGE
  - Event routing to correct FSM
  - Payload transmission

- **Payload Handling**
  - Form data extraction
  - Button name/value attributes
  - Context inclusion in events
  - Timestamp and metadata

- **Event Listener Lifecycle**
  - Attach on mount
  - Remove on unmount
  - Cleanup when view unmounts
  - Reattachment on remount

- **Event Delegation**
  - Multiple button events in container
  - Event targeting specificity
  - Delegated click handling

- **Validation**
  - Email validation before dispatch
  - Required field checks
  - Form validation before submit
  - Type checking

- **Error Handling**
  - Invalid event names
  - Missing payloads
  - Malformed JSON
  - Network errors during service calls

**Run:**
```bash
npm test -- events.test.ts
```

### 4. `integration.test.ts` – End-to-End Flows
Integration tests covering complete user journeys across multiple FSMs.

**Coverage:**
- **Complete Login Flow**
  - `idle` → `submitting` → `success`
  - Error handling: `idle` → `submitting` → `error` → `idle`
  - Token persistence
  - Retry capability

- **Account Management**
  - View flow: `loading` → `viewing`
  - Edit flow: `viewing` → `editing`
  - Save flow: `editing` → `saving` → `viewing`
  - Cancel flow: `editing` → `viewing` (preserving original)
  - Error handling in save

- **Chat Connection**
  - Connection flow: `idle` → `loading` → `connected`
  - Messaging while connected
  - Disconnect sequence
  - Connection error recovery
  - Session context persistence

- **Dashboard Loading**
  - Load flow: `idle` → `loading` → `loaded`
  - Error handling and reload
  - Data refresh capability

- **Market Data**
  - View flow: `idle` → `loading` → `loaded`
  - Filter application (no reload)
  - Reload capability
  - State preservation during filter

- **Multi-FSM Interactions**
  - Simultaneous auth and dashboard loads
  - Chat connection after login success
  - Market data persistence while chatting

- **Error Recovery**
  - Auth failure retry
  - Network timeout recovery
  - Cascading recovery across FSMs

**Run:**
```bash
npm test -- integration.test.ts
```

## Test Execution

### Run all IAM tests:
```bash
npm test -- tests/iam
```

### Run specific test file:
```bash
npm test -- tests/iam/fsms.test.ts
npm test -- tests/iam/rendering.test.ts
npm test -- tests/iam/events.test.ts
npm test -- tests/iam/integration.test.ts
```

### Run with coverage:
```bash
npm test -- tests/iam --coverage
```

### Watch mode (during development):
```bash
npm test:watch -- tests/iam
```

## Test Structure

Each test file follows a standard structure:

```typescript
// 1. Imports
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateMachine } from '@ux3/fsm';
import { config } from '../../generated/config.js';

// 2. Setup (mocks, fixtures)
const mockService = { /* ... */ };

// 3. Test suites
describe('Feature', () => {
  let fsm: StateMachine<any>;

  beforeEach(() => {
    // Fresh instance for each test
    fsm = new StateMachine(config.machines.fsmName);
  });

  describe('Behavior', () => {
    it('should do something', () => {
      // Arrange, Act, Assert
      expect(fsm.getState()).toBe('idle');
    });
  });
});
```

## Setup and Fixtures

### FSM Initialization
Each FSM is created fresh in `beforeEach()` from the generated config:

```typescript
beforeEach(() => {
  authFSM = new StateMachine(config.machines.authFSM);
});
```

### Mock Services
Tests include mock implementations of services:
- `mockAuthService` – login/logout
- `mockAccountService` – fetch/update user data
- `mockChatService` – connect/send/disconnect
- `mockMarketService` – fetch market data

### AppContext Mock
A mock `AppContext` provides:
- FSM instances
- Service references
- Style and template loaders
- i18n translations

## Key Testing Patterns

### Testing State Transitions
```typescript
authFSM.subscribe((state) => {
  if (state === 'submitting') {
    // Assert we're in expected state
    expect(state).toBe('submitting');
    // Continue to next transition
    authFSM.send('SUCCESS');
  }
});

authFSM.send('LOGIN');
```

### Testing Event Dispatch
```typescript
authFSM.send('LOGIN', {
  email: 'user@example.com',
  password: 'secret'
});

expect(authFSM.getState()).toBe('submitting');
```

### Testing Context Updates
```typescript
authFSM.send('LOGIN', { email: 'user@example.com' });
authFSM.send('SUCCESS', { token: 'jwt-123' });

const context = authFSM.getContext();
expect(context.token).toBeDefined();
```

### Testing Multi-FSM Flows
```typescript
authFSM.subscribe((state) => {
  if (state === 'success') {
    // Trigger dependent FSM
    dashboardFSM.send('LOAD');
  }
});

authFSM.send('LOGIN');
authFSM.send('SUCCESS');
```

## Coverage Goals

The test suite aims for:
- ✅ **100% FSM transition coverage** – All documented transitions tested
- ✅ **All error paths** – Invalid events, network failures, validation
- ✅ **Event binding lifecycle** – Mount, dispatch, unmount
- ✅ **Complete user flows** – Login, account edit, chat, dashboard
- ✅ **Context management** – State updates, persistence, cleanup
- ✅ **Multi-FSM interaction** – Dependent flows and simultaneous operations

## Troubleshooting

### Test Timeout
If tests hang, check:
1. FSM subscription never completes
2. State transition never occurs
3. Async operation not finishing

**Solution:** Add explicit done() or use timeout assertions

### State Not Transitioning
If FSM stays in initial state:
1. Check event name matches FSM config
2. Verify guard conditions don't block transition
3. Ensure FSM is in correct state for transition

**Solution:** Log states with `fsm.subscribe((s) => console.log(s))`

### Context Missing
If context is undefined:
1. Event payload not included
2. Context not updated in FSM config
3. Reset/cleanup clearing context

**Solution:** Check `config.machines[name]` defines context shape

### Mock Service Not Called
If mock services aren't invoked:
1. Service call in state's `invoke` block, not test
2. Check service resolution in generated config
3. Async service execution timing

**Solution:** Use `vi.spyOn()` to track actual service calls

## Related Documentation

- [FSM Core Architecture](../docs/fsm-core.md) – StateMachine API and patterns
- [View Components](../docs/view-components.md) – Component lifecycle and rendering
- [IAM Example](../docs/iam-example.md) – Complete IAM application overview
- [Validation System](../docs/validation.md) – Runtime validation patterns
- [Testing Guide](../docs/testing-guides.md) – General testing patterns for UX3

## Contributing

When adding new tests:

1. **Match naming conventions** – Use feature/behavior describe/it structure
2. **Test one thing** – Single assertion per test (or closely related)
3. **Use beforeEach** – Fresh FSM instance for each test
4. **Document complex flows** – Add comments for multi-step sequences
5. **Update this README** – Add new test files and coverage notes

## Maintenance

After updating IAM FSM configurations:

1. Run full test suite: `npm test -- tests/iam`
2. Update tests for changed transitions
3. Add tests for new states/events
4. Verify all tests pass before merging

---

**Last Updated:** [Current Date]
**Test Coverage:** 32 FSM transitions, 40+ rendering tests, 30+ event binding tests, 20+ integration flows
