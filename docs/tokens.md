# Tokens — App Guide

Overview
---
Tokens live in `examples/iam/ux/token/*` (spacing, colors, typography). They provide the single source of truth for design values and are emitted as CSS custom properties during the build.

Where to look
---
- `examples/iam/ux/token/*.yaml`
- Token usage in compositions: `examples/iam/ux/style/compositions/*`

Guidelines
---
- Prefer tokens for colors, spacing, and typography so consumers can override values via CSS vars.
- Name tokens semantically (e.g., `--color-bg-surface` rather than `--white`).

Testing
---
- Add tests that ensure token YAMLs compile into the expected CSS variables and are present in SSR output.

Reference
---
- `docs/STYLE_SPEC.md`