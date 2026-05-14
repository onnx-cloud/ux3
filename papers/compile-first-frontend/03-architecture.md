---
title: "Architecture and Compilation Pipeline"
paper: "Compile-First Frontend Architectures for Predictable UX"
chapter: 3
---

## Overview

The UX3 compilation pipeline transforms declarative widget metadata into verified, type-safe runtime artifacts. The pipeline consists of five stages: source discovery, parsing, static analysis, artifact generation, and validation reporting. Each stage preserves invariants and contributes to the overall verification guarantee.

---

## Stage 1: Source Discovery and Ingestion

The compiler discovers declarative sources across the project directory structure:

- **Widget definitions**: YAML files in `ux/widget/**/*.yaml` that declare FSM structures.
- **Templates**: Adjacent HTML files (e.g., `ux/widget/login/idle.html`) that define renderable content for specific states.
- **Styles**: YAML files in `ux/style/**` that define CSS classes, tokens, and variants.
- **Validation rules**: JSON Schema or YAML definitions in `ux/validation/**`.
- **Internationalization**: JSON files in `ux/i18n/**` that provide translated strings.
- **Routes**: YAML files in `ux/routes/**` that define navigation topology.
- **Service contracts**: YAML files in `ux/services/**` that declare service signatures.

All sources are read and stored in canonical form. Path resolution and file encoding are standardized to ensure deterministic behavior across platforms.

---

## Stage 2: Parsing and Normalization

Declarative sources are parsed into an in-memory representation. During this stage:

1. **YAML parsing**: Widget and style definitions are parsed into JavaScript objects.
2. **HTML parsing**: Templates are parsed into an AST and validated for UX3-specific bindings (e.g., `ux-state`, `ux-event`).
3. **JSON Schema parsing**: Validation rules and i18n files are validated against their respective schemas.
4. **Cross-file reference extraction**: The parser identifies all references between files (e.g., a widget references a template file, a state transition references a target state).

Output of this stage: **Normalized AST** (Abstract Syntax Tree) representing the entire application structure.

**Determinism invariant**: The AST is deterministic; parsing the same input always produces the same AST structure.

---

## Stage 3: Static Analysis and Verification

The compiled AST undergoes exhaustive static analysis to detect errors and enforce invariants. This stage comprises several sub-analyses:

### 3.1 Schema Compliance Analysis

Every declaration is validated against its formal schema:

- Widget definitions must include `initial`, `states`, and optionally `template`, `invoke`, `on`.
- State definitions must have valid template paths or `invoke` configurations.
- Event schemas must be valid JSON Schema or TypeScript-compatible type definitions.
- Service contracts must include `parameters` and `returns` schemas.

**Algorithm**: For each source file, the parser checks that the parsed AST conforms to the corresponding JSON Schema definition. Any violation is reported immediately.

### 3.2 Reachability Analysis

We compute the set of reachable states for each FSM using a depth-first search (DFS) algorithm:

$$\text{reachable}(s_0, T) = \{s \in S : \exists \text{ path from } s_0 \text{ to } s \text{ in } T\}$$

For each widget FSM:
1. Start from the initial state $s_0$.
2. For each state, follow all enabled transitions (transitions with guards that evaluate to true or guards not present).
3. Accumulate the set of visited states.
4. Report any state $s \in S$ such that $s \notin \text{reachable}(s_0, T)$.

**Error reporting**: Unreachable states typically indicate design errors and are flagged as warnings. Terminal states with no outgoing transitions are flagged as terminal (but not unreachable) and highlighted for review.

### 3.3 Type Consistency Analysis

We verify that event types flow consistently through transitions and guards:

1. For each event type $e \in \Sigma$, extract its schema $\text{schema}(e)$.
2. For each guard function $g$ that references event properties, check that the referenced properties exist in $\text{schema}(e)$ and have compatible types.
3. For each service invocation that receives context or event data, check that the data conforms to the service's parameter schema.

**Example of type error detection**:
```yaml
states:
  idle:
    on:
      SUBMIT:
        guard: ctx.form.email === event.email  # Error: event.email not in SUBMIT schema
        target: submitting
```

If the `SUBMIT` event schema does not include an `email` property, the compiler reports a type error.

### 3.4 Referential Integrity Analysis

All cross-file references are resolved:

- Template paths: Each template reference is verified to exist on disk.
- State references: Each transition target state is verified to exist within the same widget FSM.
- i18n keys: Each i18n key reference is verified to have a corresponding entry in `ux/i18n/`.
- Service references: Each service invocation is verified against declared service contracts.
- Route references: Each route path is verified to correspond to an existing widget.

**Output**: A **reference graph** that maps all cross-file dependencies. This graph is used for change detection, cache invalidation, and debugging.

### 3.5 Guard Expression Validation

Guard expressions are parsed and validated for syntactic correctness and type safety:

1. **Parse**: Each guard expression is parsed into an abstract syntax tree.
2. **Type check**: Each reference (variable, property, function call) is checked against the context schema and event schema.
3. **Semantic check**: Guard expressions are validated for common errors (e.g., comparing a string to a number without coercion, calling undefined functions).

**Example** (guard validation):
```yaml
guards:
  isAdmin: ctx.user.role === 'admin'       # Valid: ctx.user.role is a string
  isValidEmail: ctx.form.email.match(/\d/) # Valid: ctx.form.email is a string
  badGuard: ctx.user === undefined         # Warning: ctx.user existence should be checked earlier
```

---

## Stage 4: Artifact Generation

Once analysis is complete, the compiler generates typed runtime artifacts:

### 4.1 Type Definitions

TypeScript interfaces are emitted for:
- **Widget parameters**: Input types for each widget.
- **Event schemas**: Types for each event that a widget can receive.
- **Service contracts**: Input and output types for each service.
- **Context schemas**: Types for the shared context object.
- **Validation result types**: Return types for each validation rule.

**Example generated interface**:
```typescript
// ux/widget/login.yaml → Generated
export interface LoginWidgetContext {
  form: { username: string; password: string; error?: string };
  user?: { id: string; name: string };
}

export type LoginWidgetEvent = 
  | { type: 'SUBMIT'; username: string; password: string }
  | { type: 'RESET' }
  | { type: 'FOCUS_USERNAME' };
```

### 4.2 Widget Registry

A centralized registry is generated that exports all widget FSMs with their types:

```typescript
// src/generated/registry.ts
export const WidgetRegistry = {
  login: {
    initial: 'idle',
    states: { /* ... */ },
    context: {} as LoginWidgetContext,
  },
  // ... other widgets
};
```

### 4.3 Invocation Manifest

A manifest is generated that describes all service invocations, their contracts, and their runtime handlers:

```typescript
// src/generated/invoke-manifest.ts
export const InvokeManifest = {
  submitLogin: {
    parameters: SubmitLoginInput,
    returns: SubmitLoginOutput,
    handler: submitLoginHandler,
  },
  // ... other services
};
```

### 4.4 I18n Artifact

A type-safe i18n module is generated:

```typescript
// src/generated/i18n.ts
export interface I18nContent {
  login: {
    submitButton: string;
    errorMessage: string;
  };
  // ... other keys
}

export const content: I18nContent = {
  login: {
    submitButton: 'Sign In',
    errorMessage: 'Invalid credentials',
  },
};
```

### 4.5 Route Definitions

Routes are compiled to a type-safe routing table:

```typescript
// src/generated/routes.ts
export const routes = {
  '/': { widget: 'home', name: 'home' },
  '/login': { widget: 'login', name: 'login' },
  '/dashboard': { widget: 'dashboard', name: 'dashboard' },
};
```

---

## Stage 5: Validation Reporting and Output

The compiler generates a detailed validation report containing:

- **Error count**: Total number of errors found.
- **Error list**: Each error includes location (file, line), message, and suggested fix.
- **Warning list**: Non-fatal issues that should be reviewed.
- **Verification coverage**: Statistics on what was verified (e.g., "323 transitions checked, 0 unreachable states detected").
- **Performance metrics**: Compilation time, artifact size, reference graph density.

**Example output**:
```
✔ Compilation successful
  - 5 schemas validated
  - 23 transitions analyzed
  - 15 templates bound
  - 0 errors, 2 warnings

Generated artifacts:
  - src/generated/types.ts (4.2 KB)
  - src/generated/registry.ts (8.7 KB)
  - src/generated/invoke-manifest.ts (6.1 KB)
  - src/generated/i18n.ts (2.3 KB)
  - src/generated/routes.ts (1.8 KB)
```

---

## Architecture Diagram

The compilation pipeline can be visualized as follows:

```
Sources (YAML/HTML/JSON)
       ↓
  [Stage 1: Discovery]
       ↓
   Normalized AST
       ↓
  [Stage 2: Parsing]
       ↓
   Validated AST
       ↓
  [Stage 3: Analysis]
  ├─ Schema Compliance
  ├─ Reachability
  ├─ Type Consistency
  ├─ Referential Integrity
  └─ Guard Validation
       ↓
   Artifact Plan
       ↓
  [Stage 4: Generation]
  ├─ Type Definitions
  ├─ Widget Registry
  ├─ Invocation Manifest
  ├─ i18n Artifact
  └─ Routes
       ↓
  Runtime Artifacts
       ↓
  [Stage 5: Validation Report]
       ↓
   Compilation Report
```

---

## Integration with the Live Host

The compiled artifacts are not merely static outputs. Instead, they feed into the live development host, which uses them for:

1. **Hot reload**: When source files change, only affected artifacts are regenerated.
2. **Session inspection**: The runtime host has access to the artifact graph and can display current state, available transitions, and recent invocations.
3. **Replay**: Past event sequences can be re-executed against modified artifacts.
4. **Agentic planning**: Agents can reason about available state transitions and generate proposals for state transitions or data transformations.

This integration is what distinguishes UX3 from purely static compilation approaches. The compile-time guarantees are preserved, but they are put in service of interactive development rather than static deployment alone.
