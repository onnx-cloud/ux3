# RFC Process

Use RFCs for major UX3 changes that affect architecture, public APIs, or migration behavior.

## When RFC Is Required

- New core runtime concepts.
- Breaking API behavior.
- New official plugin families.
- Changes to compile pipeline or generated artifacts.
- Deprecation/removal plans.

## RFC Lifecycle

- Draft
  - Problem statement, constraints, proposal, alternatives.
- Review
  - Open review period with tracked comments and risks.
- Decision
  - Approved, rejected, or deferred.
- Implementation
  - Execution plan and milestones.
- Closeout
  - Post-implementation summary and lessons learned.

## Required RFC Sections

- Context and problem.
- Goals and non-goals.
- Design proposal.
- Compatibility and migration.
- Risks and mitigations.
- Test and validation strategy.
- Rollout and rollback plan.
- Open questions.

## Decision Rules

- No implementation merges before RFC approval for required RFC classes.
- Deferred RFCs must have explicit unblock conditions.
- Rejected RFCs should preserve rationale for future reference.
