---
title: "Developer Model and Practical Workflows"
paper: "Secure Reactive UIs with Data-Driven Sanitizers and Policy-Aware Rendering"
chapter: 4
---

## Secure-by-Default Development

The UX3 developer experience is architected around **secure-by-default principles**: developers write correct security code as a natural consequence of following framework conventions, not through explicit security reasoning at each step.

### Principle 1: Provenance is Automatic

Developers do not manually annotate provenance. Instead, the compiler infers provenance from data flow:

```yaml
# ux/widget/user-profile.yaml
states:
  loaded:
    template: templates/profile.html
    invoke:
      - service: users
        method: getProfile
        params:
          userId: ctx.userId
```

In the template:

```html
<!-- templates/profile.html -->
<div>
  <h1>{{ user.name }}</h1>                <!-- Provenance: database -->
  <p>{{ user.bio }}</p>                    <!-- Provenance: database -->
  <img src="{{ user.avatarUrl }}" />      <!-- Provenance: database -->
</div>
```

The compiler automatically infers:
- `user.name` has provenance `database` (comes from service return value)
- `user.avatarUrl` has provenance `database`
- The compiler applies the appropriate sanitization policy (URL protocol validation for `src`)

Developers do not need to think about provenance explicitly.

### Principle 2: Policies Guide Implementation

When developers bind user input, the framework enforces policies through validation:

```html
<!-- User input from form -->
<input ux-model="ctx.formData.email" type="email" />
<input ux-model="ctx.formData.name" type="text" maxlength="100" />
```

The service definition declares expected types:

```yaml
services:
  updateProfile:
    parameters:
      email: { type: string, format: email }
      name: { type: string, minLength: 1, maxLength: 100 }
```

The compiler verifies that:
1. Form input types match service parameter types
2. Validation rules in the template (e.g., `maxlength`) align with service definitions
3. Any value bound to a form field undergoes validation before the service is invoked

If a developer attempts to render user input directly without validation, the compiler **emits an error**:

```html
<!-- COMPILE ERROR: user-input provenance cannot be rendered without sanitization -->
<p>{{ userInput }}</p>
```

Developers must either:
1. Apply an explicit sanitizer, or
2. Validate the input against a schema

### Principle 3: Policy Violations Are Build Errors

When developers declare security policies, violations become compile-time errors, not runtime exceptions:

```yaml
# ux/security/policies.yaml
dangerous-fields:
  - credit_card
  - ssn
  - password_hash
rendering:
  rules:
    - provenance: external-api
      field: credit_card
      policy: never-render
```

If a developer accidentally includes a dangerous field in a template:

```html
<!-- COMPILE ERROR: dangerous field credit_card cannot be rendered from external-api provenance -->
<span>{{ paymentInfo.credit_card }}</span>
```

The compiler provides a clear error message with suggestions:
- "Remove this field from the template"
- "Change the data source to a trusted provenance"
- "Add a policy exception (requires security review)"

This converts potential vulnerabilities into immediate feedback during development.

---

## Agentic Security Reasoning

Agents can query the security model to reason about data flow and propose safe transformations.

### Agent Access to Security Metadata

The session state exposes security metadata:

```typescript
session.querySecurity({
  provenance: 'external-api',
  rendering: true
})
// Returns: [{ field: 'content', sanitizer: 'html-sanitize', verified: true }]

session.queryDangerousFields()
// Returns: ['credit_card', 'ssn', 'password_hash']

session.queryPolicies()
// Returns: [{ provenance: 'external-api', action: 'sanitize', sanitizer: 'html-sanitize' }]
```

### Agent-Proposed Rendering Changes

When an agent proposes to render a new field, it queries the security model:

**Agent reasoning**:
1. "I want to render `payment.amount` from a database service"
2. Query: `session.queryProvenance('payment.amount')` → returns `database`
3. Query: `session.queryDangerousFields()` → checks if `amount` is dangerous
4. Decision: "Safe to render; no sanitization required"
5. Proposal: "Add `<span>{{ payment.amount }}</span>` to template"

**If the field is untrusted**:
1. "I want to render `comment.text` from user input"
2. Query: `session.queryProvenance('comment.text')` → returns `user-input`
3. Query: `session.queryPolicy('user-input')` → returns `html-sanitize`
4. Decision: "Must sanitize before rendering"
5. Proposal: "Add `<span [innerText]="sanitizeHTML(comment.text)"></span>` to template" OR "Render via service sanitization"

**If the field is dangerous**:
1. "I want to render `payment.creditCard`"
2. Query: `session.queryDangerousFields()` → returns `['credit_card']`
3. Query: `session.queryPolicy('external-api', 'credit_card')` → returns `never-render`
4. Decision: "Policy violation; cannot render"
5. Proposal: "Cannot render this field due to security policy. Suggest rendering masked value or alternative field"

Agents learn from feedback: if a developer rejects a proposal due to security concerns, that failure case is recorded. Over time, agents improve their understanding of which data is safe to render.

### Audit Trail for Agent Actions

All agent rendering proposals are logged in the security audit trail:

```
2025-05-14T14:33:12Z | agent-proposal | action=render | field=user.name | provenance=database | sanitizer=none | verified=true | accepted=true
2025-05-14T14:33:15Z | agent-proposal | action=render | field=payment.cardNumber | provenance=external-api | policy=never-render | verified=false | rejected=true | reason="dangerous-field"
```

This creates an auditable record of agent decision-making and helps detect patterns in agent mistakes.

---

## Integration with CI/CD and Security Tools

### Pre-Deployment Security Verification

Before deployment, the build pipeline runs comprehensive security checks:

```bash
$ npm run build
> ux3 compile
✓ Schema validation: 847 widgets, all valid
✓ FSM reachability: No dead states detected
✓ Type safety: All invocations type-matched
✓ Security policies: All rendering complies with policies
  - 43 external-api values sanitized
  - 0 dangerous fields rendered
  - 0 policy violations detected
✓ Sanitizer coverage: 100% of untrusted data sanitized
✓ CSP header generated: default-src 'self'; script-src 'self'
```

The build fails if any security check fails, preventing deployment of vulnerable code.

### Integration with SAST Tools

UX3 can export security metadata for integration with Static Application Security Testing (SAST) tools:

```json
{
  "format": "ux3-security-export",
  "timestamp": "2025-05-14T14:35:00Z",
  "schema_version": "1.0",
  "unsafe_dataflows": [
    {
      "source": "external-api",
      "destination": "rendering",
      "field": "comment.text",
      "sanitizer": "html-sanitize",
      "verified": true
    }
  ],
  "dangerous_fields": ["credit_card", "ssn"],
  "policies": [
    {
      "provenance": "external-api",
      "action": "sanitize",
      "sanitizer": "html-sanitize"
    }
  ]
}
```

External security scanners can import this to understand the application's security posture without needing to understand UX3 internals.

### Integration with Runtime Security Monitoring

The runtime can emit security events to a centralized monitoring system:

```yaml
# ux/security/monitoring.yaml
export-events:
  - type: policy-violation
    destination: https://security-monitoring.example.com
    include: [timestamp, event-type, user-id, field, provenance]
  - type: sanitization-applied
    destination: https://security-monitoring.example.com
    include: [timestamp, field, sanitizer, result]
  - type: agent-proposal-rejected
    destination: https://security-monitoring.example.com
    include: [timestamp, agent-id, proposal-type, reason]
```

This enables real-time security monitoring and anomaly detection.

---

## Case Studies: Secure Development Workflows

### Case Study 1: Adding User-Generated Content

**Scenario**: A developer needs to render user comments in a discussion forum.

**Without UX3 security model**:
1. Developer creates a template with `<div>{{ comment.text }}</div>`
2. Later, an attacker injects `<script>alert(1)</script>` in a comment
3. XSS vulnerability detected in production
4. Incident response, patch, redeployment

**With UX3 security model**:
1. Developer creates FSM with state that displays comments
2. Attempts to render `<div>{{ comment.text }}</div>`
3. **Compiler error**: "user-input provenance cannot be rendered without sanitization"
4. Developer chooses: apply explicit sanitizer or use template safe-render directive
5. Developer implements sanitization: `<div [innerHTML]="sanitizeHTML(comment.text)"></div>`
6. Compiler verifies sanitizer is applied
7. No XSS vulnerability possible; code deploys safely

**With UX3 + agents**:
1. Developer describes desired UI: "Show user comments with timestamps"
2. Agent synthesizes FSM and template
3. Agent queries security model and proposes: "Render `comment.text` with `sanitizeHTML` sanitizer"
4. Developer reviews proposal; accepts
5. Code is correct by construction

### Case Study 2: Migrating Sensitive Data Handling

**Scenario**: A developer needs to refactor how employee salary data is displayed, moving from a direct database query to an aggregated reporting service.

**Manual approach**: Requires careful review of all templates to ensure salary data is rendered consistently and safely.

**With UX3 + agents**:
1. Developer provides context: "Migrate salary queries to new ReportingService; should never be rendered directly"
2. Agent queries security model to find all uses of salary data
3. Agent proposes refactored service calls and template changes
4. Agent verifies that all salary data now comes from ReportingService (with appropriate authorization)
5. Compiler verifies policy compliance
6. Migration is complete and verified

### Case Study 3: Implementing Policy Changes

**Scenario**: New compliance requirement: "User emails must never be logged in client-side error messages."

**Manual approach**: Search codebase for error handling, audit each instance, apply fixes individually.

**With UX3 + agents**:
1. Admin updates security policy: `{ field: "email", action: "never-log" }`
2. Build pipeline runs security check; identifies 7 locations where email could be logged
3. Agent proposes fixes: "Redact email from error messages before logging"
4. Agent applies fixes and verifies compliance
5. All 7 locations are updated consistently

---

## Performance and Debugging Under Security Constraints

### Debugging Sanitized Values

When a value has been sanitized, developers can inspect the original (unsafe) value in debug mode:

```typescript
// In development environment only
const originalValue = session.getUnsanitizedValue('user.comment.text');
const sanitizedValue = session.getSanitizedValue('user.comment.text');

console.log('Original:', originalValue);   // '<script>alert(1)</script>'
console.log('Sanitized:', sanitizedValue); // ''
```

This enables developers to understand what input was received and how sanitization transformed it, without exposing the vulnerability.

### Performance Profiling with Security Overhead

Sanitization adds a small performance cost. Developers can profile the impact:

```bash
$ npm run profile --security
Performance Report:
  Total sanitization time: 2.3ms (0.4% of total render time)
  Most common sanitizer: html-sanitize (1.8ms)
  Slowest sanitized field: product.description (0.5ms per value)
Recommendation: Consider server-side pre-sanitization for description fields
```

If sanitization becomes a bottleneck, developers can move it to the server.

---

## Summary

The UX3 security model achieves strong security guarantees while maintaining developer productivity:

- **Secure by default**: Provenance inference and policy enforcement are automatic
- **Compile-time checking**: Violations are detected before deployment
- **Transparent to agents**: Agents can reason about security constraints and propose safe changes
- **Integrated with tooling**: Security metadata integrates with SAST, runtime monitoring, and CI/CD
- **Auditable**: All security decisions are logged and reviewable

This combination makes secure development the path of least resistance, not an afterthought.
