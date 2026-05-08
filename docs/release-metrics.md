# Release Metrics

Use these metrics to evaluate UX3 releases by user value and operational quality.

## Core Metrics

- Time to first real feature
  - Median time from project init to first production-like user flow.
- Upgrade pain score
  - Number of manual edits, failed migrations, and rollback incidents.
- Idiomatic usage ratio
  - Percentage of examples/apps using recommended framework idioms.
- Reliability score
  - Regression count, crash rate, and unresolved P0/P1 defects.

## Performance Metrics

- Build time (cold and incremental).
- Hydration time and first interactive milestone.
- Runtime memory growth over long sessions.
- Bundle size change by package and by example app.

## Quality Metrics

- Test pass rates by layer (unit, integration, e2e).
- Docs freshness score (stale snippets, broken references).
- Plugin conformance coverage.
- Security findings open/closed trend.

## Release Exit Criteria

- No unresolved P0 issues.
- Upgrade path validated for deprecated surfaces in scope.
- Core metrics non-regressing vs previous release or regression justified.
- Documentation updated for all user-facing changes.
