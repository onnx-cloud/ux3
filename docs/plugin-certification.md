# Plugin Certification

This document defines quality levels for UX3 plugins and minimum requirements.

## Certification Levels

- Official
  - Maintained by UX3 core team.
  - Covered by release compatibility commitments.
- Verified
  - Maintained externally.
  - Passes UX3 conformance requirements.
- Community
  - Public plugin without verification guarantees.
- Experimental
  - Early-stage plugin with unstable API.

## Required Metadata

Every plugin should publish:

- Name and semantic version.
- Supported UX3 version range.
- Install/config example.
- Public service/event API documentation.
- Security and privacy notes.

## Conformance Requirements

Official and Verified plugins must satisfy:

- Idempotent install behavior.
- SSR-safe guards around browser-only globals.
- No raw console output in runtime paths.
- Structured error reporting and clear failure modes.
- Documented teardown behavior for listeners/timers.
- Automated tests for install, config parsing, and core service methods.

## Compatibility Matrix

Each certified plugin should maintain a matrix:

- plugin version,
- tested UX3 versions,
- known limitations,
- migration notes.

## Promotion Criteria

- Community to Verified:
  - Conformance checklist complete.
  - Compatibility matrix published.
  - At least one release cycle of stability.
- Verified to Official:
  - Core-team ownership accepted.
  - Roadmap alignment and maintenance commitment.
