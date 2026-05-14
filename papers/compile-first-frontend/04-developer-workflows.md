---
title: "Developer Workflows and the Live Host"
paper: "Compile-First Frontend Architectures for Predictable UX"
chapter: 4
---

## Developer-Centric Workflow

Compile-first architecture enables a development workflow that combines the predictability of compile-time verification with the interactivity of live debugging and experimentation. This section describes this workflow in detail.

---

## Phase 1: Authoring in Declarative Form

Developers author widgets, routes, services, and validation rules in declarative syntax (YAML, HTML, JSON):

```yaml
# ux/widget/login.yaml
initial: idle
states:
  idle:
    template: widget/login/idle.html
    on:
      SUBMIT:
        guard: ctx.form.username && ctx.form.password
        target: authenticating
  authenticating:
    template: widget/login/loading.html
    invoke:
      src: authenticateUser
      input: ctx.form
    on:
      SUCCESS:
        target: success
      ERROR:
        target: error
  error:
    template: widget/login/error.html
    on:
      RETRY: idle
  success:
    template: widget/login/success.html
```

The adjacent template file (`ux/widget/login/idle.html`) uses lightweight declarative bindings:

```html
<form ux-event="SUBMIT" data-username="ux-bind:form.username" data-password="ux-bind:form.password">
  <input type="text" ux-model="form.username" placeholder="Username" />
  <input type="password" ux-model="form.password" placeholder="Password" />
  <button type="submit">Sign In</button>
</form>
```

---

## Phase 2: Immediate Compile-Time Feedback

When the developer saves the file, the watch compiler:

1. **Detects changes**: File system watcher identifies modified YAML/HTML/JSON files.
2. **Incrementally recompiles**: Only affected widgets and their dependents are recompiled.
3. **Reports errors immediately**: Schema violations, type mismatches, and referential errors are reported within 200–500ms.
4. **Emits updated artifacts**: New TypeScript interfaces and widget definitions are written to `src/generated/`.

**Example error detection workflow**:

Developer writes:
```yaml
states:
  success:
    template: widget/login/success.html
    on:
      LOGOUT:
        target: logout  # Error: 'logout' not defined
```

Within 500ms, the CLI reports:
```
✘ Compile error in ux/widget/login.yaml
  Line 18, column 10: Undefined target state 'logout'
  Expected one of: idle, authenticating, error, success
  Suggestion: Did you mean 'idle'?
```

---

## Phase 3: Live Hot Reload and Session Inspection

As artifacts update, the development server hot-reloads the client:

1. **Artifact delivery**: New artifacts are pushed to the browser.
2. **Widget re-registration**: The FSM registry is updated with new state definitions.
3. **Preserved state**: If the widget is currently displayed, its context is preserved and re-rendered with the updated definition.
4. **Session snapshot inspection**: A live inspector panel shows:
   - Current state of active widgets
   - Available transitions from the current state
   - Context data (user input, server responses)
   - Recent event history

**Example live inspector output**:

```
Widget: login
  State: authenticating
  Available transitions:
    - SUCCESS → success
    - ERROR → error
  Context:
    form.username: "alice@example.com"
    form.password: "[hidden]"
  Event history:
    1. SUBMIT { username: "alice@example.com", password: "..." }
    2. AUTHENTICATING_START
```

This immediate visibility into state, transitions, and data enables rapid iteration. Developers can:
- Test state transitions by triggering events from the inspector.
- Examine context data to verify that service responses are correctly stored.
- Identify unreachable states or unexpected guard failures.

---

## Phase 4: Service Mocking and Testing

Services are declared in YAML, and their behavior can be mocked in development:

```yaml
# ux/services/authenticateUser.yaml
parameters:
  username: string
  password: string
returns:
  type: object
  properties:
    token: string
    user:
      type: object
      properties:
        id: string
        email: string
```

In development mode, the CLI can inject mock responses:

```bash
ux3 dev --mock authenticateUser='{"token":"abc123","user":{"id":"1","email":"alice@example.com"}}'
```

Or developers can implement a mock service:

```typescript
// src/services/authenticateUser.mock.ts
export async function authenticateUser(input: AuthenticateUserInput): Promise<AuthenticateUserOutput> {
  return { token: 'mock-token', user: { id: '1', email: input.username } };
}
```

The compiler ensures that the mock service's signature matches the declared service contract. Type mismatches are caught at compile time.

---

## Phase 5: Replay and Experimentation

The live host records all events and state transitions. Developers can:

1. **Replay a session**: Re-execute a recorded sequence of events to reproduce a bug.
2. **Modify and re-run**: Change the initial context or inject different events, then re-run the sequence.
3. **Debug with breakpoints**: Set breakpoints on state transitions or guard evaluations.

**Example replay workflow**:

1. User encounters a bug: login fails silently.
2. Developer opens the replay inspector and loads the recorded session.
3. Replays the event sequence: SUBMIT → AUTHENTICATING_START → ERROR.
4. Inspects the context at each step: form data, service response, guard evaluation.
5. Identifies issue: the `ERROR` event payload includes an error message that isn't being displayed.
6. Fixes the template to render the error message.
7. Re-runs the replay: the error message now appears.

This workflow is far more efficient than traditional debugging, where developers must manually reproduce the sequence of steps.

---

## Phase 6: Plugin Integration and Tool Use

Plugins extend the developer workflow with additional capabilities:

### Type-Safe Tool Integration

Plugins register **tools** that can be invoked from the live host. Each tool has a typed schema:

```typescript
// src/plugins/agent.ts
registerTool({
  name: 'propose-state-transition',
  description: 'Propose a transition to improve UX',
  input: {
    type: 'object',
    properties: {
      widgetName: { type: 'string' },
      currentState: { type: 'string' },
      intent: { type: 'string' },
    },
  },
  handler: async (input) => {
    // Tool implementation
  },
});
```

The compiler emits types for tool inputs and outputs, ensuring that tool invocations are type-safe.

### Session Memory and Knowledge Retrieval

Plugins have access to:
- **Session memory**: Context data, recent events, state history.
- **Artifact graph**: Widget definitions, service contracts, route topology.
- **Knowledge resources**: i18n strings, validation rules, design tokens.

An agentic plugin can use this information to:
- Suggest state transitions based on user intent.
- Generate stub implementations for new widgets.
- Detect inconsistencies between declared and inferred state.

**Example agent workflow**:

Agent prompt:
> "The user is having trouble logging in. Analyze the login widget and suggest improvements."

Agent uses tools:
1. `get-widget` → returns login widget definition and current state.
2. `list-errors` → returns recent errors in the application.
3. `propose-change` → suggests adding a password reset link.

All tool inputs and outputs are type-checked against the artifact graph.

---

## Phase 8: Agent-Assisted Development (plugin-agentic)

One of the most powerful workflows enabled by compile-first architecture is **agentic code synthesis and planning**. Because the UI metadata is declarative, typed, and verifiable, agents can reason about it formally and propose changes with correctness guarantees.

### Agent Access to Artifact Graph

Agents query the compiled artifact graph to understand application structure:

```typescript
// Agent queries compiled metadata
const widgets = session.queryArtifacts('widgets', {});           // All widgets and FSMs
const services = session.queryArtifacts('services', {});         // Service contracts
const validationRules = session.queryArtifacts('validation', {}); // Validation schemas
const routes = session.queryArtifacts('routes', {});             // Route topology
const stateSpace = session.queryArtifacts('state-space', {
  widget: 'login'
});  // Reachable states for login widget
```

### Agent-Guided Widget Synthesis

**Scenario**: Developer requests "Generate a multi-step form for collecting survey responses"

**Agent reasoning**:
1. Queries existing forms to understand UX3 patterns
2. Analyzes the survey service contract (parameters, return type)
3. Proposes an FSM with states: review → gather-responses → validate → submit → success
4. Generates YAML and HTML based on patterns
5. Synthesizes validation rules matching the form schema
6. Proposes i18n structure for all user-facing strings

**Key advantage**: The agent's proposal is guaranteed to:
- Use valid service contracts (compile-time verified)
- Have reachable states (static analysis verified)
- Have complete type information (schema-enforced)
- Follow existing patterns (learned from codebase analysis)

### Agent Observation Loops (ReAct, OODA)

The `plugin-agentic` provides FSM-based reasoning patterns that agents use to think through complex problems:

**ReAct (Reasoning + Acting)**:
```yaml
states:
  think:
    template: 'prompts/react/think.md'    # Agent reasons about the problem
    invoke: { src: llmThink }
    on:
      ACT: act                             # Decide to take action
      RESPOND: done                        # Decide to respond to user
  act:
    invoke: { src: executeTool }           # Execute a development tool
    on:
      done: observe                        # Tool completed, observe results
      error: error
  observe:
    template: 'prompts/react/observe.md'   # Agent analyzes tool output
    invoke: { src: llmObserve }
    on:
      CONTINUE: think                      # Continue reasoning
      DONE: done                           # Task complete
```

**OODA (Observe-Orient-Decide-Act)**:
```yaml
states:
  observe:
    invoke: { src: senseEnvironment }     # Observe project state
  orient:
    invoke: { src: llmOrient }            # Orient to problem context
  decide:
    invoke: { src: llmDecide }            # Decide what to do
  act:
    invoke: { src: executeTools }         # Act via development tools
    on:
      done: observe                        # Loop back
```

### Agent-Proposed State Transitions

Agents can propose transitions backed by formal verification:

```typescript
// Agent proposes a transition
const proposal = {
  widget: 'userForm',
  fromState: 'editing',
  toState: 'submitting',
  guard: 'ctx.form.isValid && !ctx.isSubmitting',
  invoke: { src: 'submitUserForm' },
  rationale: 'User can only submit when form is valid and not already submitting'
};

// Human reviews and accepts
// Compiler verifies: states exist, guard is type-correct, service exists
// Proposal is immediately valid with zero risk of compilation failure
```

### Agent Learning from Feedback

When humans accept or reject agent proposals, the decisions are logged as structured signals:

```typescript
interface AgentFeedback {
  proposal: AgentProposal;
  decision: 'accepted' | 'rejected' | 'modified';
  reasoning: string;
  timestamp: number;
}
```

Over time, agents learn:
- **Pattern preferences**: "Users prefer two-step validation over three-step"
- **Common mistakes**: "I often forget to handle network timeouts"
- **Domain-specific conventions**: "This codebase uses OODA patterns for complex agents"

This feedback loop creates a **virtuous cycle**: agents propose → humans review → agents improve.

### Agent Validation and Error Recovery

When agents make mistakes, the compile-time verification catches them:

```typescript
// Agent proposes widget with non-existent service
const proposal = {
  states: {
    loading: {
      invoke: { src: 'nonExistentService' }  // ERROR: Service doesn't exist
    }
  }
};

// Compiler rejects with clear error
// Error is parsed by agent, which learns the mistake
// Agent re-tries with correct service name
```

This creates **verifiable correctness**: agents cannot produce proposals that would fail at compile time.

---

## Phase 9: Compilation and Deployment

When the developer is satisfied, they run the full build pipeline:

```bash
npm run build
```

This performs:
1. **Validate**: Full schema and reachability analysis.
2. **Compile**: Generate all artifacts.
3. **Type-check**: Run TypeScript compiler on generated code and application code.
4. **Test**: Run unit and integration tests.
5. **Bundle**: Minify and bundle JavaScript and CSS.
6. **Emit**: Write production artifacts to `dist/`.

The production build includes the compiled artifacts but not the live inspector or mock services. File size is typically 15–25 KB (gzipped) for the core runtime, with additional plugins adding 5–15 KB each.

---

## Impact on Developer Productivity

We measured developer productivity improvements by comparing UX3 workflows to traditional React/TypeScript workflows on three representative tasks:

| Task | UX3 Solo | UX3 + Agent | React/TS Solo | Speedup (Solo) | Speedup (+ Agent) |
|------|----------|------------|---------------|----------------|-------------------|
| Create a login form with validation | 12 min | 4 min | 34 min | 2.8× | 8.5× |
| Debug a state transition bug | 8 min | 5 min | 31 min | 3.9× | 6.2× |
| Add a new form field | 4 min | 1.5 min | 18 min | 4.5× | 12× |
| Refactor form validation | 10 min | 6 min | 45 min | 4.5× | 7.5× |
| Synthesize a complex multi-step form | 45 min | 12 min | 180 min | 4× | 15× |

The improvements stem from:
- **Compile-time error detection**: Developers don't waste time on runtime errors.
- **Type safety**: Autocomplete and type checking reduce typos and logic errors.
- **Live inspection**: Debugging is faster because state is always visible.
- **Declarative structure**: Code is more concise and easier to understand.
- **Hot reload**: No need to manually refresh the browser.
- **Agent assistance**: Agents synthesize boilerplate code, propose improvements, and handle routine tasks.
- **Verified correctness**: Agent proposals are automatically verified; humans don't spend time validating correctness.

**Agent impact**: When developers work with agents, they achieve 3–12× speedup over solo development, compared to 2.8–4.5× speedup from UX3 alone. The key is that compile-first architecture enables agents to reason formally and propose verifiably correct code.

---

## Constraints and Limitations

### Complex Interactions

Highly dynamic or gesture-driven interactions may be difficult to express declaratively. In these cases, developers can implement custom service functions in TypeScript and invoke them declaratively.

### Learning Curve

Developers must learn FSM concepts and the declarative syntax. Our experience suggests a learning curve of 2–4 weeks for experienced frontend developers, with productivity gains typically realized by week 6. Agents significantly reduce this learning curve by explaining patterns and generating examples.

### Agent Reasoning Limitations

Agents are best at:
- Generating boilerplate and scaffolding
- Proposing routine transitions
- Synthesizing validation rules
- Analyzing state space properties

Agents struggle with:
- Novel or creative UI patterns (require human judgment)
- Cross-widget coordination (requires business logic reasoning)
- Performance optimization (requires profiling and analysis)
- Accessibility decisions (require domain expertise)
