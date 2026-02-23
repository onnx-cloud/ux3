# Tailwind Usage — CDN + `ux-style` lookup

Why CDN?
---
- For the example apps (IAM) we opt to load Tailwind via CDN during development and demos for fast iteration and to avoid build-time purge complications. The CDN provides a comprehensive set of utilities so we don't need to safelist generated classes.
- For production builds, prefer producing a trimmed Tailwind bundle (via a build step) to reduce CSS size.

How styling is authored (no classes in templates)
---
- Templates should be markup-only. Instead of writing:

```html
<my-view class="text-3xl font-bold underline">Title</my-view>
```

- Authors should use semantic lookups in `ux/style` (YAML compositions). For example, a composition named `my.view` can live in `examples/iam/ux/style/compositions/my.view.yaml`:

```yaml
my:
  view:
    base: 'text-3xl font-bold underline'
    props:
      color: 'gray-800'
    alternate:  'text-xl font-bold'

```

- Template becomes:

```html
<my-view></my-view>

<!-- or override with a composition -->
<my-view ux-style="my.view"></my-view>
<!-- or override to a different style -->
<my-view ux-style="my.view.alternate"></my-view>
```

How the compiler resolves `ux-style`
---
- The compiler will map:
  - `ux-style="<key>"` → add `class="ux-style-<key> <composition-classes>"` to the element for SSR parity. Example: `<div class="ux-style-my.view text-3xl font-bold underline">`.
  - If an element has no `ux-style`, the compiler attempts to find a default composition for the tag name (e.g., `my-view` → `my.view`) and applies it as a default class. This keeps markup concise and predictable.
- `class` attribute remains supported and wins over generated composition classes (consumer override precedence).

Tailwind CDN usage
---
- Dev include (HTML):

```html
<script src="https://cdn.tailwindcss.com"></script>
```

- Notes:
  - CDN includes nearly all utilities so purge/safelist is not needed for development or docs examples.
  - For production, create a PostCSS/Tailwind build that scans your generated output for classes and produces a smaller CSS bundle.

Tokens, CSS variables & theming
---
- Use tokens (`ux/token/*`) for themeable values (colors, spacing). The compiler emits tokens as CSS custom properties (e.g., `--spacing-md`) that ./styles/ can consume.
- Prefer overriding tokens for site-wide theming: override CSS vars on `:root` or a top-level app container for scoped themes.

Overriding & Granularity
---
- To override a composition locally use `ux-style` to switch named compositions.
- Never use `class` or CSS variables on the host of the component.

Migration guidance (from util-classes-in-templates)
---
- Replace direct utility classes in templates with semantic composition lookups in `ux/style/**/*.yaml`.
- Keep changes minimal: generate with the same class lists initially, then gradually move towards tokenized values for colors/spacing.

Examples
---
- Default usage:

```html
<my-view>Content</my-view>
```

- Explicit composition override:

```html
<my-view ux-style="my.view.alternate">Content</my-view>
```

