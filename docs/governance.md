# Governance

This page consolidates release/process policies.

## Deprecation

- Deprecate in stages: announce, warn, remove.
- Keep migration guidance and timelines explicit.
- Avoid silent behavior changes.

## RFCs

Use RFCs for major architectural/API changes, especially when:
- Runtime behavior changes across apps
- Public interfaces or plugin contracts change
- Build/validation rules are added or tightened

## Release Quality

Release readiness should include:
- Green build, type-check, lint, and core tests
- No unresolved critical regressions
- Documented changes and migration notes when needed

## Plugin Quality

- Define compatibility expectations.
- Require conformance tests for mature plugins.
- Track certification/quality level for ecosystem trust.
