# Plugins

UX3 supports built-in, project-level, and package-based plugins.

## Plugin Types

- Built-in framework plugins
- Project plugins in `src/plugins/**`
- External plugins in `packages/@ux3/*` or third-party packages

## Development Checklist

- Keep plugin behavior explicit and side-effect boundaries clear.
- Define option schemas/types for predictable usage.
- Add unit and integration coverage.
- Document extension points and compatibility expectations.

## Operational Notes

- Prefer deterministic plugin hooks.
- Validate plugin output in build and test pipelines.
- Maintain backward compatibility or provide migration notes.
