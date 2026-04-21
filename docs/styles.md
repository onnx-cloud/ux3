# Styles

Use styles in UX3 through semantic keys and design tokens, not ad-hoc per-template CSS.

The goal is consistency, theming, and reuse across views and components.

---

## Core Pattern

In templates, apply style keys with `ux-style`:

```html
<main ux-style="home-main">
	<h1 ux-style="home-title">{{i18n.home.title}}</h1>
	<p ux-style="home-description">{{i18n.home.description}}</p>
</main>
```

Define what those keys mean in your style compositions under `ux/style`.

---

## Style Layers

Use this layering model:

1. tokens: color, spacing, typography, radius, shadows, motion
2. compositions: semantic keys mapped to utility classes or style bundles
3. templates/components: apply `ux-style` keys only

This keeps visual design centralized and easy to evolve.

---

## Design Token Guidelines

Use tokens for values that should be consistent across the app:

- spacing scale
- typography scale
- color roles (`surface`, `accent`, `danger`, `success`)
- elevation levels
- animation durations/easing

Avoid hardcoded visual values in templates unless there is a one-off reason.

---

## Composition Naming

Prefer descriptive keys tied to intent:

- `home-main`
- `home-title`
- `capability-card`
- `error-panel`

Avoid purely presentational names like `blue-box-large`.

---

## Theming and Overrides

For multi-theme apps:

- keep semantics stable
- switch token values by theme scope
- avoid reworking template markup per theme

If you need consumer overrides, do it at token/composition level first.

---

## Component Styling Rules

For reusable ux-* components:

- expose semantic style hooks and parts
- avoid app-specific style assumptions
- ensure states (hover, focus, disabled, loading, error) are styled
- preserve accessibility contrast and focus visibility

---

## Testing Style Contracts

Validate that:

- every key used in templates has a style composition
- token usage is consistent with design system rules
- major UI states remain visually coherent

For critical paths, include visual or snapshot tests.

---

## Related Guides

- [docs/tokens.md](tokens.md)
- [docs/ux-style.md](ux-style.md)
- [docs/parts-and-theming.md](parts-and-theming.md)
- [docs/developer-user-guide.md](developer-user-guide.md)

