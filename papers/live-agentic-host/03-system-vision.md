---
title: "System Vision and Architecture"
paper: "Live Collaborative Agentic UX: An LLM-Native Host for Stateful Human-AI Workflows"
chapter: 3
---

## The Collaboration Problem

Traditional software development is asynchronous and text-centric: developers write code, push to repositories, and await CI/CD feedback. Code review is a document-based process where reviewers read diffs and make comments. When developers and AI assistants collaborate, the interaction is even more fragmented:

1. **Tool isolation**: IDE, version control, test runner, and AI assistants operate independently without shared context.
2. **Stateless interaction**: Each AI prompt starts fresh; prior context must be re-provided as text in every interaction.
3. **Opaque reasoning**: When an agent suggests a change, the reasoning is often implicit in the generated text, not verifiable against the application model.
4. **No recovery**: If an agent's suggestion is wrong, there's no structured way to recover or provide feedback for improvement.

The result is friction: developers must manually translate AI suggestions into code, validate them against the application model, and provide feedback through natural language rather than formal rejection/acceptance signals.

## The Vision: Collaborative Development as Shared State

We propose inverting this model. Instead of text-centric collaboration, we create a **shared cognitive surface** where:

1. **Session state is first-class**: The entire development state (open files, FSM definitions, widget context, recent tool calls) is queryable and persistable.
2. **Planning is stateful**: Agents propose hierarchical plans with explicit milestones. Humans can accept, reject, or modify plans before execution.
3. **Tools have contracts**: Every tool (code generation, refactoring, synthesis, analysis) is defined as a typed interface that agents use to reason about applicability.
4. **Feedback is structured**: Acceptances and rejections are logged as formal signals, not just text comments. This enables agents to learn from the feedback.

### Example: Collaborative Widget Synthesis

**Scenario**: A developer wants to add a login widget to an existing UX3 application.

**Traditional workflow**:
1. Developer asks AI: "Generate a login widget for UX3"
2. AI provides code (YAML + HTML)
3. Developer manually copies it, tests it, fixes errors
4. ~20-30 minutes total

**Collaborative workflow (with shared session state)**:
1. Developer expresses intent: "Create a login widget that validates email/password and integrates with the existing auth service"
2. Agent inspects session state:
   - Retrieves existing authentication service definition
   - Analyzes the widget schema
   - Reviews similar widgets in the codebase
3. Agent proposes a plan:
   - Generate YAML FSM with states: idle, validating, authenticating, error, success
   - Generate HTML template with form bindings
   - Bind authentication service invocation to the AUTHENTICATING state
4. Human reviews the plan and accepts
5. Agent executes: generates files, validates against schema
6. Hot reload: widget appears in the running application
7. Human tests: if there's an issue, they provide feedback ("The error message isn't displaying")
8. Agent analyzes the feedback against session history, identifies the issue, proposes a fix
9. ~5-8 minutes total, with verifiable correctness at each step

**Key differences**:
- Agent reasons about **structured artifacts** (FSM definitions, type schemas), not just text
- **Plans are explicit** and human-reviewable before execution
- **Feedback is formal** (accept/reject against a concrete proposal, not text comments)
- **State is shared** (agent sees running application state, recent errors, test results)

---

## Core Components of the Live Host

### 1. Session Memory and State Registry

The host maintains a **session registry** that includes:

```typescript
interface SessionState {
  // File system state
  openFiles: Map<string, FileContent>;
  recentChanges: Change[];
  
  // Application model state
  widgets: WidgetRegistry;
  services: ServiceManifest;
  routes: RouteDefinitions;
  i18n: I18nContent;
  
  // Runtime state
  activeWidgetStates: Map<string, FSMState>;
  contextSnapshots: Map<string, ContextData>;
  recentEvents: Event[];
  
  // Tool invocation history
  toolCalls: ToolInvocation[];
  toolResults: ToolResult[];
  
  // Planning state
  activePlans: Plan[];
  planHistory: Plan[];
}
```

This state is queryable via a **session API** that agents use to inspect and reason about the application:

```typescript
// Agent queries
const widget = session.getWidget('login');
const authService = session.getService('authenticateUser');
const currentState = session.getWidgetState('login');
const recentErrors = session.getErrors(lastNMinutes: 5);
```

### 2. Typed Tool Contracts

Every tool is defined as a typed contract:

```typescript
interface ToolContract {
  name: string;
  description: string;
  input: JSONSchema;
  output: JSONSchema;
  preconditions?: Predicate[];
  effect?: EffectDescription;
}

// Example: widget synthesis tool
const synthesizeWidgetTool: ToolContract = {
  name: 'synthesize-widget',
  description: 'Generate a new widget FSM and template from a specification',
  input: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      initialStates: { type: 'array', items: { type: 'string' } },
      transitions: { type: 'array' },
      serviceInvocations: { type: 'array' },
    },
  },
  output: {
    type: 'object',
    properties: {
      yaml: { type: 'string' }, // YAML FSM definition
      html: { type: 'string' }, // HTML template
      types: { type: 'string' }, // Generated types
    },
  },
  preconditions: [
    'widget name is unique',
    'all referenced services exist',
  ],
};
```

Agents use tool contracts to:
1. **Discover tools**: Query available tools and their capabilities
2. **Check preconditions**: Verify that tool invocation is valid
3. **Reason about effects**: Understand what state changes a tool will make
4. **Compose tools**: Chain multiple tools to achieve a goal

### 3. Explicit Planning with Checkpoints

Rather than one-shot prompting, agents propose **structured plans**:

```typescript
interface Plan {
  goal: string; // High-level intent
  steps: PlanStep[];
  checkpoints: Checkpoint[]; // Human review points
}

interface PlanStep {
  tool: string;
  input: Record<string, any>;
  expectedOutput: string;
  rationale: string; // Why this step is necessary
}

interface Checkpoint {
  stepIndex: number;
  humanReview: {
    question: string; // What human should verify
    options: string[]; // Accept / Reject / Modify
  };
}

// Example plan
const plan: Plan = {
  goal: 'Add a login widget to the application',
  steps: [
    {
      tool: 'analyze-service',
      input: { serviceName: 'authenticateUser' },
      expectedOutput: 'Service definition with parameter and return types',
      rationale: 'Understand the authentication service interface',
    },
    {
      tool: 'synthesize-widget',
      input: {
        name: 'login',
        initialStates: ['idle', 'authenticating', 'success', 'error'],
        serviceInvocations: [
          { state: 'authenticating', service: 'authenticateUser' },
        ],
      },
      expectedOutput: 'YAML FSM and HTML template',
      rationale: 'Generate widget scaffolding based on service contract',
    },
    {
      tool: 'validate-widget',
      input: { widgetName: 'login' },
      expectedOutput: 'Validation report (success or errors)',
      rationale: 'Verify widget compiles without errors',
    },
  ],
  checkpoints: [
    {
      stepIndex: 1,
      humanReview: {
        question: 'Does the generated widget match the intended behavior?',
        options: ['Accept', 'Reject and explain', 'Modify and retry'],
      },
    },
  ],
};
```

**Execution model**:
1. Agent proposes plan
2. Human reviews plan (reads goal, rationale for each step, checkpoint questions)
3. Human accepts or rejects the plan (or requests modifications)
4. If accepted, agent executes steps sequentially
5. At each checkpoint, human can halt execution, inspect results, and decide whether to proceed
6. Results and decisions are logged for future reference

### 4. Operational Self-Knowledge

The host maintains **operational intelligence**: introspection into its own behavior:

```typescript
interface OperationalIntelligence {
  // Performance metrics
  recentCompilations: CompilationResult[];
  failureHistory: Failure[];
  hotspots: {
    filesThatFailOften: string[];
    statesThatCrashOften: FSMState[];
    servicesThatTimeout: ServiceName[];
  };
  
  // Development patterns
  frequentErrorPatterns: ErrorPattern[];
  commonRefactorings: Refactoring[];
  testCoverageGaps: string[];
  
  // Agent decision history
  agentSuggestionsAccepted: number;
  agentSuggestionsRejected: number;
  agentMistakes: string[];
}
```

This intelligence is used to:
1. **Predict issues**: "This change is similar to a previous mistake; be careful"
2. **Improve suggestions**: "Users often reject suggestions of this type; try a different approach"
3. **Identify patterns**: "This error pattern appears in 5 similar scenarios; suggest a systematic fix"

### 5. Self-Documenting Interactions

All interactions are logged as **structured artifacts**:

```typescript
interface InteractionLog {
  timestamp: number;
  type: 'agent-proposal' | 'human-acceptance' | 'human-rejection' | 'tool-invocation';
  
  // For proposals
  proposal?: {
    goal: string;
    plan: Plan;
    rationale: string;
  };
  
  // For acceptances/rejections
  decision?: {
    stepIndex?: number;
    reason: string;
    feedback?: string; // Structured feedback for improvement
  };
  
  // For tool invocations
  toolCall?: {
    tool: string;
    input: any;
    output: any;
    duration: number;
    success: boolean;
  };
}
```

These logs are queryable and can be used to:
1. **Understand collaboration patterns**: What types of suggestions do users accept?
2. **Debug agent errors**: Why did the agent make a wrong suggestion?
3. **Improve agent behavior**: Use logs as training data for fine-tuning

---

## Integration Points with UX3

### Session State Querying

Agents access application state through well-defined queries:

```typescript
// Get widget definition
const loginWidget = session.query('widget', { name: 'login' });

// Get service contract
const authService = session.query('service', { name: 'authenticateUser' });

// Get runtime state
const currentState = session.query('state', { widget: 'login' });
const contextData = session.query('context', { widget: 'login' });

// Get history
const recentEvents = session.query('events', { widget: 'login', last: 100 });
const recentErrors = session.query('errors', { last: 5 * 60 * 1000 }); // Last 5 minutes
```

### Tool Integration

Agents invoke development tools through typed contracts:

```typescript
// Synthesize a new widget
const result = await session.invokeTool('synthesize-widget', {
  name: 'profileCard',
  description: 'Display user profile with edit button',
});

// Validate all widgets
const validation = await session.invokeTool('validate-all', {});

// Generate tests for a widget
const tests = await session.invokeTool('generate-tests', {
  widget: 'login',
  coverage: 'paths', // Test all state paths
});
```

### Replay and Experimentation

Agents can replay sessions to experiment with hypothetical changes:

```typescript
// Record a session
const session = recordSession(widget);

// Hypothetically modify and re-run
const modifiedWidget = { ...widget, guard: 'ctx.user.role === "admin"' };
const replay = replaySession(modifiedWidget, session);

// Compare outcomes
console.log(session.finalState); // Original
console.log(replay.finalState); // With modification
```

---

## Collaborative UX Principles

### 1. Explicitness Over Convenience

Agents prefer explicit plans over implicit magic. Instead of generating code directly, agents propose structured plans that humans can review and steer.

### 2. Checkpoints Over Autonomy

Rather than autonomous execution, the system favors explicit checkpoints where humans review and approve changes. This maintains control while enabling agent assistance.

### 3. Feedback as Data

All human decisions (accept, reject, modify) are logged as structured signals. Over time, this feedback shapes agent behavior.

### 4. Transparency in Reasoning

Agent reasoning is documented: rationales for each step, precondition checks, and alternative approaches are visible to humans.

---

## Research Questions

1. **Plan synthesis**: How should agents generate plans optimized for human review? (Cf. Yao et al. 2023 on ReAct, Wei et al. 2022 on chain-of-thought)
2. **Feedback learning**: How do we use human acceptances/rejections to improve agent suggestions? (Cf. Ziegler et al. 2019 on RLHF)
3. **Collaborative convergence**: When do human-agent teams outperform humans or agents alone? (Cf. Horvitz 1999 on mixed-initiative systems)
4. **Trust calibration**: How do we maintain appropriate levels of human skepticism? (Cf. Bansal et al. 2019 on explanations and user trust)
