# Tailwind Usage — Local Build + `ux-style` lookup

Why local Tailwind?
---
- `cdn.tailwindcss.com` is not recommended for production.
- UX3 now defaults `@ux3/plugin-tailwind-css` to a local stylesheet (`/tailwind.css`) so projects can use a normal build pipeline.
- This aligns with Tailwind's installation guidance for local tooling (for example, Vite/PostCSS workflows).

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

Tailwind local setup (Vite-style workflow)
---
- Install Tailwind tooling:

```bash
npm install -D tailwindcss @tailwindcss/vite vite
```

- Add Tailwind's Vite plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()]
});
```

- Import Tailwind in your CSS entrypoint:

```css
/* tailwind.css */
@import "tailwindcss";
```

- Configure the UX3 plugin to point at your generated/local CSS file:

```yaml
plugins:
  - name: '@ux3/plugin-tailwind-css'
    config:
      css: '/tailwind.css'
```

- Optional legacy fallback (discouraged for production):

```html
<script src="https://cdn.tailwindcss.com"></script>
```

- Notes:
  - Use `config.css` for local assets and keep `config.cdn` only for temporary demos.
  - If your local file is emitted into `public/tailwind.css`, the default `/tailwind.css` works without extra configuration.

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

