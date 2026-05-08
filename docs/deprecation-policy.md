# Deprecation Policy

This policy defines how UX3 APIs, plugins, primitives, and behaviors are deprecated.

## Objectives

- Keep upgrades predictable.
- Avoid sudden breaks for production users.
- Provide clear migration paths.

## Deprecation Stages

- Stage 0: Proposal
  - Reason, impact, alternatives, and migration path documented.
- Stage 1: Soft deprecation
  - API remains functional.
  - Docs are marked as deprecated.
  - Release notes include migration guidance.
- Stage 2: Hard deprecation
  - Runtime warnings enabled in development.
  - Codemod or explicit migration steps published.
- Stage 3: Removal
  - API removed from runtime and docs.
  - Removal only in a major version.

## Minimum Timelines

- Soft deprecation to hard deprecation: at least 1 minor release.
- Hard deprecation to removal: at least 2 minor releases.
- Security exceptions may use accelerated timelines with explicit rationale.

## Required Artifacts

- Deprecation note in docs.
- Changelog entry with migration steps.
- Upgrade guide section with before/after examples.
- Tracking issue with checklist and removal target.

## Warning Requirements

- Warnings must include:
  - deprecated API name,
  - planned removal release,
  - replacement API,
  - link to migration documentation.

## Compatibility Rules

- Deprecated behavior must remain functionally stable during the deprecation window.
- New features should not depend on deprecated APIs.
- Official examples must be migrated before removal.
