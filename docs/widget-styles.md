# Widget & Primitive Style Guide

## Architecture overview

UX3 widgets use **light DOM by default** with `registerLightStyle()` for inject-once CSS.
Shadow DOM is reserved for cases where isolation is required for correctness (e.g., `ux-field`,
`ux-modal`, `ux-file-upload`).

Theme-aware styling should depend on root state rather than widget-specific hardcoded palettes.
- Use `data-color-scheme="light|dark"` for binary color scheme toggles.
- Use `data-theme-style="<variant>"` for full runtime theme variants.
- Prefer CSS custom properties and attribute selectors so theme variants can apply at runtime.

Core primitives live in `@ux3/ux-primitives` (canonical implementation package).
`@ux3/ui` is a curated compatibility surface that re-exports helpers for app authors.

## Quick decision tree

```
Simple wrapper?  →  Light DOM  +  registerLightStyle()
Complex/isolated? →  Shadow DOM  +  getStyles()
```

---

## Light DOM primitives

All form controls, toggles, and simple containers use light DOM:

| Widget | DOM | Style pattern |
|---|---|---|
| `ux-input` | Light | `registerLightStyle` |
| `ux-textarea` | Light | `registerLightStyle` |
| `ux-select` | Light | `registerLightStyle` + MutationObserver sync |
| `ux-combobox` | Light | `registerLightStyle` |
| `ux-checkbox` | Light | `registerLightStyle` |
| `ux-radio-group` | Light | `registerLightStyle` |
| `ux-date-picker` | Light | `registerLightStyle` |
| `ux-search-bar` | Light | `registerLightStyle` |
| `ux-toggle` / `ux-switch` | Light | `registerLightStyle` |
| `ux-slider` | Light | `registerLightStyle` |
| `ux-badge`, `ux-avatar`, `ux-spinner`, `ux-skeleton` | Light | `registerLightStyle` |
| `ux-capture` | Light | Inline styles |
| `ux-tabs`, `ux-menu`, `ux-breadcrumb` | Light | `registerLightStyle` |
| `ux-page`, `ux-card`, `ux-alert` | Light | `registerLightStyle` |
| `ux-progress`, `ux-empty-state`, `ux-error-panel` | Light | `registerLightStyle` |

1.  Import `registerLightStyle` and call it **at module level**:

    ```ts
    import { registerLightStyle } from '../../style-registry.js';

    const STYLE_ID = 'ux-widget-style';
    const STYLE_CSS = `
      ux-widget { display: inline-block; }
      ux-widget[data-variant="primary"] { background: var(--color-primary, #3b82f6); }
    `;
    registerLightStyle(STYLE_ID, STYLE_CSS);
    ```

2.  Use **CSS custom properties** with hardcoded fallbacks everywhere:

    ```css
    /* preferred — theme-aware */
    background: var(--color-primary, #3b82f6);
    padding: var(--spacing-md, 1rem);

    /* avoid — won't respond to theme changes */
    background: #3b82f6;
    ```

3.  Register your custom element at module level:

    ```ts
    if (!customElements.get('ux-widget')) {
      customElements.define('ux-widget', UxWidget);
    }
    ```

---

## Shadow DOM widgets

Used only when internal markup must be isolated:

| Widget | Justification |
|---|---|
| `ux-field` | Form-associated custom element; label/hint/error isolation |
| `ux-modal` | Dialog isolation with backdrop |
| `ux-file-upload` | Drag-drop zone + progress + hidden input isolation |
| `ux-dropdown` | Dropdown panel z-index and scroll isolation |
| `ux-command-palette` | Overlay isolation |

1.  Attach in constructor, render in `onConnected`:

    ```ts
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
    ```

2.  Expose CSS custom properties on `:host` for theming:

    ```css
    :host {
      --field-spacing: 1rem;
      --field-label-color: #1f2937;
      --field-error-color: #dc2626;
    }
    ```

3.  Avoid magic constants. Use `var(--token, fallback)`:

    ```css
    /* good */
    color: var(--field-label-color, #1f2937);
    /* bad */
    color: #1f2937;
    ```

---

## Form variant system

All form primitives support `data-variant` attributes:

```html
<!-- Default -->
<ux-input name="email" type="email"></ux-input>

<!-- Compact -->
<ux-input name="email" type="email" data-variant="compact"></ux-input>

<!-- Filled -->
<ux-input name="email" type="email" data-variant="filled"></ux-input>

<!-- Stacked (radio-group only) -->
<ux-radio-group name="size" data-variant="stacked" options="S,M,L"></ux-radio-group>
```

Available variants per control:

| Control | Variants |
|---|---|
| `ux-input` | `compact`, `filled` |
| `ux-textarea` | `compact`, `filled` |
| `ux-select` | `compact`, `filled` |
| `ux-checkbox` | `compact` |
| `ux-radio-group` | `stacked` |

---

## Widget registration

Both core and plugin widgets use the same shared registry:

```ts
import { registerWidget } from '@ux3/ux-primitives';

registerWidget({
  tag: 'ux-my-plugin-widget',
  role: 'region',
  kind: 'region',
  family: 'layout',
});
```

Query metadata:

```ts
import { resolveWidgetMetadata } from '@ux3/ui';
const meta = resolveWidgetMetadata('ux-input');
// { tag: 'ux-input', role: 'textbox', kind: 'input' }
```

---

## Canonical tag families

Form / input controls:
`ux-input` `ux-textarea` `ux-select` `ux-combobox` `ux-checkbox` `ux-switch` `ux-radio-group` `ux-slider` `ux-date-picker` `ux-file-upload`

Navigation / selection:
`ux-tabs` `ux-menu` `ux-breadcrumb` `ux-pagination` `ux-tree-nav` `ux-command-palette`

Overlays:
`ux-popover` `ux-tooltip` `ux-drawer` `ux-context-menu`

Media / content:
`ux-image` `ux-video` `ux-audio` `ux-wysiwyg` `ux-capture`

Layout / structure:
`ux-card` `ux-page` `ux-region` `ux-splash`

Feedback / status:
`ux-alert` `ux-empty-state` `ux-error-panel` `ux-spinner` `ux-progress` `ux-notifications` `ux-badge` `ux-avatar` `ux-skeleton`

---

## Anti-patterns

- **Don't hardcode colours.**  Use `var(--color-*, fallback)` in every CSS block.
- **Don't call `document.head.appendChild` directly.**  Use `registerLightStyle`.
- **Don't register custom elements in `onConnected`.**  Do it at module level.
- **Don't use shadow DOM as a styling shortcut.**  Light DOM is preferred.
- **Don't add new `ux-*` tags outside canonical families without clear justification.**
