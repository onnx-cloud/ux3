# IAM Tests — Quick Start

## Overview
Complete unit and integration test suite for IAM example application with **100+ tests** covering FSM transitions, view rendering, event binding, and end-to-end flows.

## Files Created

```
tests/iam/
├── fsms.test.ts              (262 lines)  32 FSM transition tests
├── rendering.test.ts         (350+ lines) View rendering tests
├── events.test.ts            (400+ lines) Event binding tests (30+)
├── integration.test.ts       (600+ lines) End-to-end flows (20+)
├── test-utils.ts            (400+ lines) Utilities and helpers
├── README.md                 (500+ lines) Full documentation
└── run-tests.sh                          Test runner script
```

## Run Tests

```bash
# All IAM tests
npm test -- tests/iam

# Specific test suite
npm test -- tests/iam/fsms.test.ts
npm test -- tests/iam/rendering.test.ts
npm test -- tests/iam/events.test.ts
npm test -- tests/iam/integration.test.ts

# Watch mode
npm test:watch -- tests/iam

# With coverage
npm test -- tests/iam --coverage

# Using script
./tests/iam/run-tests.sh all
./tests/iam/run-tests.sh fsm
./tests/iam/run-tests.sh watch
```

## Test Coverage

| Component | Tests | Files |
|-----------|-------|-------|
| FSM Transitions | 32 | fsms.test.ts |
| View Rendering | 15+ | rendering.test.ts |
| Event Binding | 30+ | events.test.ts |
| Integration | 20+ | integration.test.ts |
| **Total** | **100+** | **4 files** |

## What's Tested

### FSM Transitions (fsms.test.ts)
- ✅ Auth FSM – Login flow, error handling, retry
- ✅ Account FSM – Load, view, edit, save workflow
- ✅ Chat FSM – Connect, message, disconnect
- ✅ Dashboard FSM – Load, error, reload
- ✅ Market FSM – View, filter, reload

### View Rendering (rendering.test.ts)
- ✅ Template rendering and swapping
- ✅ State-driven visibility
- ✅ DOM updates on FSM transitions
- ✅ Layout application
- ✅ CSS state reflection

### Event Binding (events.test.ts)
- ✅ ux-event directive binding
- ✅ Form and button events
- ✅ Event payload handling
- ✅ Listener lifecycle
- ✅ Form validation
- ✅ Error handling

### Integration (integration.test.ts)
- ✅ Complete login flow
- ✅ Account management workflow
- ✅ Chat connection and messaging
- ✅ Dashboard loading
- ✅ Market data viewing
- ✅ Multi-FSM coordination
- ✅ Error recovery flows

## Using Test Utilities

### Test Data
```typescript
import { testData } from './test-utils';

testData.validUser              // { email, password }
testData.userProfile            // User data
testData.token                  // JWT token
testData.chatSession            // Chat config
testData.marketData             // Market data
testData.errors.networkError    // Error response
```

### FSM Helpers
```typescript
import { createTestFSM, waitForState } from './test-utils';

// Create FSM
const fsm = createTestFSM(config.machines.authFSM);

// Wait for state
await waitForState(fsm, 'success', 1000);

// Assert transition
assertTransition(fsm, 'idle', 'LOGIN', 'submitting');
```

### Scenarios
```typescript
import { testScenarios } from './test-utils';

// Run common flow
await testScenarios.successfulLogin(authFSM);
await testScenarios.editAndSaveAccount(accountFSM);
await testScenarios.sendChatMessage(chatFSM);
```

## Documentation

Full documentation in [tests/iam/README.md](README.md) with:
- Detailed test descriptions
- Test patterns and examples
- Setup and fixtures guide
- Troubleshooting guide
- Contributing guidelines

## Integration with CI/CD

Add to your CI pipeline:
```bash
# In GitHub Actions, GitLab CI, or similar
npm test -- tests/iam --coverage

# Optionally fail if coverage below threshold
npm test -- tests/iam --coverage --coverage.lines=80
```

## Next Steps

1. **Run tests:** `npm test -- tests/iam`
2. **Watch development:** `npm test:watch -- tests/iam`
3. **Check coverage:** `npm test -- tests/iam --coverage`
4. **Read patterns:** See [tests/iam/README.md](README.md)
5. **Add tests:** Use [test-utils.ts](test-utils.ts) helpers

## Key Patterns

### FSM Testing
```typescript
let fsm: StateMachine;

beforeEach(() => {
  fsm = new StateMachine(config.machines.authFSM);
});

it('should transition on event', () => {
  fsm.send('LOGIN', { email: 'user@example.com' });
  expect(fsm.getState()).toBe('submitting');
});
```

### Integration Testing
```typescript
it('should complete login flow', (done) => {
  fsm.subscribe((state) => {
    if (state === 'success') {
      done();
    }
  });
  
  fsm.send('LOGIN');
  fsm.send('SUCCESS');
});
```

## Related Documentation

- [fsm-core.md](../../docs/fsm-core.md) – FSM Architecture
- [view-components.md](../../docs/view-components.md) – View System
- [iam-example.md](../../docs/iam-example.md) – IAM Overview
- [TESTING-IMPLEMENTATION.md](../../TESTING-IMPLEMENTATION.md) – Implementation Details

---

**Status:** ✅ Complete
**Total Tests:** 100+
**Coverage:** Comprehensive
