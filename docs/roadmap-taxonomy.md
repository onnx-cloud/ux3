# Roadmap Taxonomy

This taxonomy standardizes how UX3 roadmap items are proposed, prioritized, and tracked.

## Categories

- Platform: app lifecycle, runtime model, state management, routing core.
- Primitives: UI primitives, contracts, accessibility behavior, composability.
- Plugins: official ecosystem packages and plugin APIs.
- DX: CLI, scaffolding, compiler diagnostics, devtools, local workflow.
- Reliability: failure isolation, recovery, deterministic behavior, observability.
- Performance: compile time, bundle size, hydration, interaction latency.
- Security: sanitization, policies, threat model, telemetry safety.
- Ecosystem: docs, examples, templates, community workflow.

## Prioritization Fields

Each roadmap item should include:

- Category: one of the taxonomy categories.
- User impact: low, medium, high.
- Reach: narrow, broad, platform-wide.
- Risk: low, medium, high.
- Effort: S, M, L, XL.
- Dependencies: required upstream work.
- Success metric: measurable outcome.
- Exit criteria: what defines done.

## Priority Model

- P0: blocks core app correctness, security, or framework trust.
- P1: high-value improvements that unblock common production scenarios.
- P2: polish, consistency, or medium-value expansion.
- P3: exploratory or opportunistic work.

## Release Mapping

- Every release should include at least one item from Platform, DX, and Reliability.
- No release should include major feature additions without explicit success metrics.
- P0 items always preempt P2/P3 unless approved as delayed with written rationale.

## Roadmap Entry Template

```md
Title:
Category:
Priority:
Problem:
Proposal:
Dependencies:
Risks:
Success metric:
Exit criteria:
Owner:
Target release:
```
