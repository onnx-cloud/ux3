# @ux3/test-harness

Comprehensive testing utilities and fixtures for the UX3 Framework. Simplifies testing of FSMs, services, and views with fluent APIs, mock fixtures, and assertion helpers.

## Installation

```bash
npm install @ux3/test-harness
# or
yarn add @ux3/test-harness
```

## Features

### FSM Testing
- **TestFSMBuilder**: Fluent API to build test FSMs
- **FSMTestFixture**: All-in-one fixture with state and event tracking
- **FSMStateTracker**: Track state transitions and sequences
- **FSMEventTracker**: Record and assert FSM events

### Service Testing
- **MockHttpService**: Mock HTTP requests and responses
- **MockJSONRPCService**: Mock JSON-RPC method calls
- **ServiceCallRecorder**: Record and inspect service calls
- **ServiceErrorSimulator**: Inject failures for error path testing
- **ServiceSpy**: Spy on service method calls

### View Testing
- **MockAppContext**: Mock application context for views
- **MockShadowDOM**: Simulate Shadow DOM for testing
- **ViewTestFixture**: Complete view testing environment
- **StateRenderingHelper**: Test state template rendering

## Quick Start

### Testing an FSM

```typescript
import { TestFSMBuilder, FSMTestFixture } from '@ux3/test-harness';

describe('Login FSM', () => {
  it('should transition through login flow', async () => {
    // Create test FSM
    const fsm = new TestFSMBuilder()
      .withInitial('idle')
      .addStateWithTransitions('idle', { SUBMIT: 'loading' })
      .addStateWithTransitions('loading', { SUCCESS: 'loggedIn', ERROR: 'failed' })
      .addStateWithTransitions('loggedIn', { LOGOUT: 'idle' })
      .build();

    // Create fixture with tracking
    const fixture = new FSMTestFixture(fsm);

    // Test transitions
    await fixture.transitionTo('SUBMIT', 'loading');
    fixture.assertEventWasSent('SUBMIT');

    // Verify state sequence
    fixture.stateTracker.assertSequence(['idle', 'loading']);
  });
});
```

### Testing Services

```typescript
import { MockHttpService, ServiceCallRecorder } from '@ux3/test-harness';

describe('API Service', () => {
  it('should fetch data', async () => {
    // Create mock service
    const api = new MockHttpService()
      .mockResponse('GET:https://api.example.com/users', {
        method: 'GET',
        status: 200,
        ok: true,
        data: [{ id: 1, name: 'Alice' }],
      });

    // Record calls
    const recorder = new ServiceCallRecorder();
    api.fetch = (req) => {
      recorder.createMiddleware()(req, async () => api.fetch(req));
    };

    // Make request
    const response = await api.fetch({
      method: 'GET',
      baseUrl: 'https://api.example.com/users',
    });

    // Verify
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(1);
    api.assertWasCalled('GET:https://api.example.com/users', 1);
  });
});
```

### Testing Views

```typescript
import { ViewTestFixture } from '@ux3/test-harness';

describe('LoginView', () => {
  it('should render form in idle state', () => {
    // Create fixture
    const fixture = new ViewTestFixture();

    // Register templates
    fixture
      .registerStateTemplate('login', 'idle', '<form><input placeholder="Username"/></form>')
      .registerStateTemplate('login', 'loading', '<p>Logging in...</p>')
      .registerStateTemplate('login', 'success', '<p>Welcome!</p>');

    // Verify content
    const content = fixture.getRenderedContent();
    fixture.assertContentContains('Username');

    // Simulate user interaction
    fixture.simulateEvent('input', 'focus');
    fixture.assertEventOccurred('focus');
  });
});
```

## API Reference

### FSM Testing

#### TestFSMBuilder

```typescript
const fsm = new TestFSMBuilder()
  .withInitial('idle')
  .addState('loading')
  .addStateWithTransitions('idle', { START: 'loading' })
  .addStateWithInvoke('loading', { service: 'api', method: 'fetch' })
  .mockService('api', 'fetch', async () => ({ data: 'test' }))
  .build();
```

#### FSMTestFixture

```typescript
const fixture = new FSMTestFixture(fsm);

// Transition and verify state
await fixture.transitionTo('SUBMIT', 'loading', 0);

// Get current state
const state = fixture.getState();

// Verify state sequence
fixture.stateTracker.assertSequence(['idle', 'loading', 'success']);

// Verify events
fixture.eventTracker.assertEventSent('SUBMIT');
fixture.eventTracker.assertSequence(['SUBMIT', 'SUCCESS']);
```

#### Trackers

```typescript
// State tracking
const stateTracker = new FSMStateTracker();
stateTracker.track(fsm);
const history = stateTracker.getHistory(); // ['idle', 'loading', 'success']
stateTracker.getStateDuration('loading', 0); // ms

// Event tracking
const eventTracker = new FSMEventTracker();
eventTracker.track(fsm);
eventTracker.assertEventSent('SUBMIT', { userId: 123 });
```

### Service Testing

#### MockHttpService

```typescript
const api = new MockHttpService();

// Register responses
api.mockResponse('GET:https://api.example.com/data', {
  method: 'GET',
  status: 200,
  ok: true,
  data: { id: 1 },
});

// Call service
const response = await api.fetch({ method: 'GET', baseUrl: 'https://api.example.com/data' });

// Verify
api.assertWasCalled('GET:https://api.example.com/data', 1);
api.getRequestCount(); // 1
api.getRequests(); // [{ method: 'GET', ... }]
```

#### ServiceCallRecorder

```typescript
const recorder = new ServiceCallRecorder();
const middleware = recorder.createMiddleware();

// Apply middleware to service
service.addMiddleware(middleware);

// Record calls
await service.fetch(request);

// Inspect
recorder.getCalls(); // Array of recorded calls
recorder.getCallsFor('GET'); // Calls with GET method
recorder.getAverageResponseTime(); // ms
recorder.assertRequestMade('GET', /api\.example\.com/);
```

#### ServiceErrorSimulator

```typescript
const simulator = new ServiceErrorSimulator()
  .configureFailure('GET:https://api.example.com/users', 'Network error', 0);

const middleware = simulator.createMiddleware();

// Simulate error
try {
  await service.fetch(request);
} catch (err) {
  expect(err.message).toBe('Network error');
}
```

### View Testing

#### ViewTestFixture

```typescript
const fixture = new ViewTestFixture();

// Register templates
fixture.registerStateTemplate('login', 'idle', '<form>...</form>');
fixture.registerStateTemplates('login', {
  idle: '<form>...</form>',
  loading: '<p>Loading...</p>',
  success: '<p>Success!</p>',
});

// Check rendering
fixture.assertContentContains('Username');
fixture.assertContentNotContains('Error');

// Simulate events
fixture.simulateEvent('button[type="submit"]', 'click', { formData: {} });
fixture.assertEventOccurred('click', 'button[type="submit"]');

// Query elements
const form = fixture.find('form');
const inputs = fixture.findAll('input');

// Cleanup
fixture.cleanup();
```

## Usage Patterns

### Complete Integration Test

```typescript
import { 
  TestFSMBuilder, 
  FSMTestFixture,
  MockHttpService,
  ViewTestFixture,
} from '@ux3/test-harness';

describe('Login Flow E2E', () => {
  it('should handle complete login workflow', async () => {
    // Setup FSM
    const fsm = new TestFSMBuilder()
      .withInitial('form')
      .addStateWithTransitions('form', { SUBMIT: 'authenticating' })
      .addStateWithInvoke('authenticating', 
        { service: 'auth', method: 'login' },
        'success'
      )
      .mockService('auth', 'login', async ({ username }) => ({
        token: `token_${username}`,
      }))
      .build();

    // Setup view
    const viewFixture = new ViewTestFixture();
    viewFixture.registerStateTemplates('login', {
      form: '<form><input id="username"/></form>',
      authenticating: '<p>Authenticating...</p>',
      success: '<p>Welcome!</p>',
    });

    // Setup fixture
    const fixture = new FSMTestFixture(fsm);

    // Simulate user flow
    fixture.simulateEvent('input[id="username"]', 'change');
    fixture.simulateEvent('form', 'submit');

    // Verify transitions
    await fixture.transitionTo('SUBMIT', 'authenticating', 50);
    await fixture.transitionTo('SUCCESS', 'success', 50);

    // Verify final state
    expect(fixture.getState()).toBe('success');
    viewFixture.assertContentContains('Welcome!');
  });
});
```

## Performance Testing

```typescript
const recorder = new ServiceCallRecorder();
service.addMiddleware(recorder.createMiddleware());

// Make requests
for (let i = 0; i < 100; i++) {
  await service.fetch(request);
}

// Analyze performance
console.log(`Average response time: ${recorder.getAverageResponseTime()}ms`);
console.log(`Total calls: ${recorder.getCallCount()}`);
```

## Best Practices

1. **Use Builders for Complex Objects**
   ```typescript
   const fsm = new TestFSMBuilder()
     .withInitial('idle')
     .addState('loading')
     // ...
     .build();
   ```

2. **Track Both States and Events**
   ```typescript
   const fixture = new FSMTestFixture(fsm);
   fixture.stateTracker.assertSequence([...]);
   fixture.eventTracker.assertSequence([...]);
   ```

3. **Mock At Appropriate Levels**
   ```typescript
   // Mock HTTP requests, not business logic
   api.mockResponse(url, response);
   
   // Don't mock FSM state machines - test real behavior
   const fsm = new TestFSMBuilder()...build();
   ```

4. **Clean Up Resources**
   ```typescript
   afterEach(() => {
     fixture.cleanup();
     service.reset();
   });
   ```

## Changelog

### v1.0.0 (Initial Release)
- FSM testing utilities (builders, fixtures, trackers)
- Service testing utilities (mocks, recorders, simulators)
- View testing utilities (mock context, fixtures)
- Comprehensive documentation and examples

## Contributing

Contributions welcome! Please open issues or pull requests on the UX3 repository.

## License

MIT - See LICENSE file in repository root
