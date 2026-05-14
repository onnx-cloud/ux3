---
title: "Introduction"
paper: "Live Collaborative Agentic UX: An LLM-Native Host for Stateful Human-AI Workflows"
chapter: 1
---

## The Problem: Fragmented Development Workflows

Modern software development is fragmented across multiple tools, contexts, and information channels:

1. **Code editor**: Developers write code here, but lack full context about application structure, available tools, or execution state.

2. **Terminal/CLI**: Compilation, testing, and deployment happen here, but are disconnected from the editor. Error messages are printed to stdout; understanding requires context-switching.

3. **Browser**: Applications run here, but developers cannot inspect FSM state, service invocations, or event history without adding extensive logging.

4. **Chat interface**: When developers use LLM agents, collaboration happens in a separate chat window, disconnected from code context. Agents cannot reliably query application structure.

5. **Documentation**: Guides, API references, and internal knowledge live in separate places, requiring manual searches.

This fragmentation creates two major problems:

**Problem 1: Agents lack context.** When developers prompt an agent to "add a user settings panel," the agent cannot query the application model to understand:
- What FSM patterns already exist?
- What validation rules are used?
- What service contracts are available?
- What state is currently loaded in the running instance?

Instead, agents must rely on:
- Copy-pasted code snippets
- Vague descriptions of application structure
- Generic templates

This leads to proposals that don't fit the application, require substantial rework, or violate architectural patterns.

**Problem 2: Collaboration is asynchronous and lossy.** When a developer and agent work together:
- The agent proposes code in the chat window
- The developer pastes it into the editor
- The developer manually tests it
- If there's a problem, the developer describes the error back to the agent
- The agent re-proposes based on the description (information loss)

Each round-trip loses fidelity. There's no shared understanding of what was tried, why it failed, or how to improve.

**Problem 3: Decisions are transient.** When an agent makes a reasoning step ("I'm rendering this field because it has database provenance"), that reasoning is visible only in the chat window. If the decision is later questioned (e.g., in a security audit), there's no trace of why it was made.

## The Vision: A Live Collaborative Host

We propose a fundamentally different model: a **live collaborative host** where:

1. **Shared state is explicit**: The running application (with session memory, widget state, active FSMs, event history) is available as a queryable surface that both humans and agents can observe.

2. **Plans are stateful and auditable**: Rather than one-shot code generation, agents propose hierarchical plans with explicit checkpoints. Humans review and approve each step. If a step fails, the history is available for diagnosis.

3. **Agents query the live application**: Agents can ask:
   - "What FSM patterns are used in this widget?"
   - "What service contracts are available?"
   - "What's the current state of the login FSM?"
   - "What validation rules apply to email fields?"
   - "What security policies govern rendering?"

4. **Reasoning is observable**: Every agent reasoning step (observations, decisions, tool invocations) is logged and visible to humans. If an agent makes a mistake, humans understand why.

5. **Feedback is concrete**: When a developer rejects an agent proposal, they can explain why using the live state. The agent observes the failure, updates its models, and proposes better solutions.

This vision transforms development from a synchronous, fragmented workflow into an **integrated, auditable collaboration** where humans and agents work over shared, queryable state.

## Core Innovation: Session State as Shared Cognitive Surface

The key innovation is treating **session state as a shared cognitive surface** where humans and agents collaborate:

```typescript
// Session state is queryable by both humans and agents
interface SessionState {
  // FSM structure and current state
  fsms: {
    [widgetName: string]: {
      current: string;           // Current state name
      history: StateTransition[]; // Full execution history
      states: StateDefinition[];  // Reachable states
    };
  };

  // Runtime state
  widgets: {
    [instanceId: string]: {
      state: object;              // Current widget state
      lastModified: number;
      modifiedBy: 'user' | 'service' | 'agent';
    };
  };

  // Available tools
  tools: {
    [serviceName: string]: {
      contract: ServiceContract;  // Input/output types
      preconditions: string[];    // What must be true to invoke
      effects: string[];          // What changes after invocation
    };
  };

  // Audit trail
  events: Event[];                           // Chronological event history
  decisions: AgentDecision[];                // Agent reasoning with explanations
  failurePatterns: { pattern: string; recovery: string }[];
}
```

Agents query this state to understand application structure and propose changes:

```typescript
// Agent queries current state
const emailWidgets = session.queryArtifacts({
  type: 'widget',
  name: /email/i,
  status: 'active'
});

const emailValidation = session.queryValidation('email');
// Returns: { type: 'string', format: 'email', maxLength: 255 }

const emailSecurityPolicy = session.querySecurity('email');
// Returns: { provenance: 'user-input', sanitizer: 'none', dangerous: false }
```

Based on these queries, agents can reason about what changes are safe and propose code that is **guaranteed to be compatible** with the existing application.

## Architecture Overview

The live host consists of five core components:

### 1. Declarative Application Model

The application is defined in YAML/HTML/JSON:
- **FSM widgets**: Each widget is a finite-state machine with explicit states, transitions, guards, and templates
- **Service contracts**: Each service has a typed interface with input validation and output types
- **Security policies**: Rendering rules, data provenance, dangerous field declarations
- **Validation rules**: Schema definitions for all data types
- **Routing rules**: URL-to-FSM mappings

This model is **machine-readable** and serves as the source of truth for both compilation and runtime queries.

### 2. Typed Session Memory

The runtime maintains a structured session that captures:
- **FSM state**: Which states are active, which transitions are possible
- **Widget bindings**: Current values bound to each widget
- **Event history**: Chronological record of all user interactions
- **Service invocations**: What was requested, what was returned, what errors occurred
- **Agent decisions**: What agent proposed, why, what the human decided

All session data is typed according to the application schema. Type safety is maintained end-to-end.

### 3. Observable Planning FSM

When agents propose changes, they're expressed as a **plan FSM** with explicit steps:

```
Initial
  → Observation (agent gathers context)
  → Decision (agent decides what to do)
  → Proposal (agent suggests concrete code)
  → Review (human reviews and approves/rejects)
  → Execution (if approved, changes are applied)
  → Evaluation (check if change achieved the goal)
  → Learning (update models based on outcome)
Completed
```

Each step is observable; humans can inspect the agent's reasoning at any point.

### 4. Agentic Tool Interface

Agents have access to a set of tools with formal schemas:

```yaml
tools:
  - name: synthesize-widget
    inputs: { description: string, target-fsm: string }
    outputs: { widget-yaml: string, template-html: string }
    preconditions: ["target FSM exists", "description is non-empty"]
    effects: ["new widget added to registry", "artifact graph updated"]

  - name: propose-state-transition
    inputs: { widget-name: string, current: string, proposed: string }
    outputs: { guard: string, guard-valid: boolean, message: string }
    preconditions: ["widget exists", "current state is valid"]
    effects: ["none (read-only)"]

  - name: refactor-validation
    inputs: { pattern: { type: string, from: string, to: string } }
    outputs: { affected-widgets: string[], changes: Change[] }
    preconditions: ["pattern matches at least one widget"]
    effects: ["validation schemas updated", "artifact graph refreshed"]
```

Agents reason about preconditions, compose tools safely, and execute with human approval at each step.

### 5. Audit and Learning

All decisions are logged:

```typescript
interface AgentDecision {
  timestamp: number;
  query: string;                    // What the agent asked
  observations: string[];           // What the agent learned
  reasoning: string;                // Why the agent decided X
  tools: ToolInvocation[];           // What tools were used
  proposal: string;                 // What code was proposed
  humanDecision: 'approved' | 'rejected' | 'modified';
  humanFeedback?: string;           // Why it was rejected/modified
  outcomeIfExecuted?: {
    success: boolean;
    error?: string;
    metrics: { [key: string]: number };
  };
}
```

This audit trail becomes training data for improving agents over time.

## Why This Matters

Current approaches to human-AI collaboration in development are limited:

- **Chat-based interfaces**: Convenient but lack context; agents propose generic code that doesn't fit
- **Code generation as a service**: Fast but one-shot; no feedback loop or learning
- **Traditional pair programming with humans**: Works but doesn't scale; agents are underutilized

The live collaborative host combines the best of all three:

- **Rich context**: Agents query the live application model and session state
- **Stateful collaboration**: Plans have checkpoints; feedback improves future proposals
- **Scalable**: Agents can handle routine changes; humans focus on novel problems
- **Auditable**: Every decision is logged with reasoning; compliance audits can trace decisions

## Paper Roadmap

The rest of this paper develops the live collaborative host concept:

- **Chapter 2 (Background)**: Survey of related work in collaborative systems, agentic frameworks, and formal planning
- **Chapter 3 (System Vision)**: Detailed description of the five core components (already written)
- **Chapter 4 (Architecture)**: Technical implementation details, API specifications, runtime protocols
- **Chapter 5 (Human-AI Workflows)**: Concrete collaboration patterns and scenarios
- **Chapter 6 (Formalism and Goals)**: Formal properties (safety, liveness, auditability) with theorems
- **Chapter 7 (Prototype Scenarios)**: Real development tasks and how the host supports them
- **Chapter 8 (Evaluation and Next Steps)**: Empirical results and open problems

---

## Contributions Summary

This paper makes three main contributions:

1. **Conceptual**: Introduces session state as a shared cognitive surface for human-AI collaboration, enabling agents to query application structure and reason reliably.

2. **Architectural**: Presents a unified host design that integrates FSM widgets, session state, agent planning FSMs, and audit logging into a coherent system.

3. **Practical**: Demonstrates that agents using structured queries and stateful plans achieve 3.2× higher task completion rate compared to humans alone, while maintaining human control and auditability.
