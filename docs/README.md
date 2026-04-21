# UX3 Documentation

This documentation is written for people building with UX3: application developers, plugin authors, and teams shipping production apps. It focuses on what you use day to day, not framework internals.

---

## Start Here

- [Developer and User Guide](developer-user-guide.md): end-to-end workflow covering FSMs, events, styles, i18n, and content.
- [Build and Development](build-and-dev.md): local workflow, build, validation, and test commands.
- [Views](views.md): how to build screens using YAML + HTML.
- [Routing](routing.md): map URLs to views.
- [Services](services.md): connect APIs and side effects.

---

## Core Developer Flows

The five core UX3 topics are covered in these guides:

- [FSM Core](fsm-core.md): model view behavior with explicit states and transitions.
- [Events Guide](events.md): publish, listen, and route events between templates and FSMs.
- [Styles](styles.md): style via ux-style with reusable, token-driven compositions.
- [i18n](i18n.md): localize UI with validated translation keys.
- [Content Guide](content.md): manage markdown/frontmatter content and route it into views.

---

## Practical Guides

- [Template System](template-system.md): template syntax and rendering patterns.
- [Validation](validation.md): schema and compile-time checks.
- [Tokens](tokens.md): design token conventions.
- [Parts and Theming](parts-and-theming.md): consistent theming strategy.
- [Testing Guides](testing-guides.md): unit, integration, and e2e testing.
- [Accessibility](accessibility.md): accessibility baseline for production UX.

---

## Example Projects

- [IAM Example](iam-example.md): complete end-to-end app reference.
- [Examples Overview](example.md): how to use and adapt bundled examples.

---

## Typical Build Loop

```bash
# Develop
npm run dev

# Validate and build
npm run build

# Test
npm run test
```

Use this index as your entry point, then jump into the focused guides for FSMs, events, styles, i18n, and content.
