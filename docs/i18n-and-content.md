# i18n and Content

## i18n Rules

- Store user-facing text under `ux/i18n/**`.
- Reference keys from templates and logic, not literal copy.
- Treat missing keys as build-time quality issues.

## Content Rules

- Author markdown/content files in dedicated content locations.
- Route content into views through data/context.
- Keep content structure predictable for build validation.

## Practical Guidance

- Design key namespaces by feature.
- Keep placeholders explicit and consistent.
- Add tests for critical localized flows and fallback behavior.
