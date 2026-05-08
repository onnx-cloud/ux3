# UX3 Documentation

This is a compact, task-first guide to UX3.

UX3 is a compile-first SPA framework:
- UI behavior is defined as FSMs in YAML.
- Templates are adjacent HTML files.
- Styles, tokens, i18n, and routes are declarative.
- Build steps validate and generate typed artifacts.

## Start Here

1. [Quickstart](quickstart.md)
2. [Build and Test](build-and-test.md)
3. [Views and FSMs](views-and-fsms.md)
4. [Templates and Styling](templates-and-styling.md)
5. [Services and Side Effects](services-and-side-effects.md)

## Core Topics

- [Routing](routing.md)
- [Runtime Architecture](runtime-architecture.md)
- [Forms and Validation](forms-and-validation.md)
- [i18n and Content](i18n-and-content.md)
- [Plugins](plugins.md)
- [Security and Accessibility](security-and-accessibility.md)
- [Examples](examples.md)

## Engineering Policies

- [Governance](governance.md)

## Rules That Prevent Common Mistakes

- Never edit files in `src/generated/` by hand.
- Keep user-visible strings in i18n files.
- Keep network and side effects in services.
- Keep view behavior in FSM state transitions, not ad-hoc DOM code.
