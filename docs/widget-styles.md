# Widget & Primitive Style Guide

## Quick decision tree

```
Simple wrapper?  →  Light DOM  +  registerLightStyle()
Complex/isolated? →  Shadow DOM  +  getStyles()
```

---

## Light DOM primitives (badge, toggle, spinner, avatar, button…)

1.  Import `registerLightStyle` and call it **at module level** (not in the constructor or
    `onConnected`).

    ```ts
    import { registerLightStyle } from '../../style-registry.js';

    const STYLE_ID = 'ux-widget-style';
    const STYLE_CSS = `
      ux-widget { display: inline-block; }
      ux-widget[variant="primary"] { background: var(--color-primary, #3b82f6); }
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

4.  Add a **style key** in `src/build/default-styles.ts` with the minimal structural
    class string needed for the host element:

    ```ts
    'ux-widget': 'inline-flex gap-2',
    ```

    If you install `@ux3/plugin-tailwind-css`, the plugin overlays richer Tailwind
    classes automatically.  Core defaults should be structural only (display, layout,
    spacing) — leave colours and decoration to the plugin.

---

## Shadow DOM widgets (modal, gantt, kanban, chart…)

1.  Attach a shadow root in the constructor:

    ```ts
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
    ```

2.  Provide styles via a `getStyles()` method or inline in `innerHTML`.  Use
    CSS custom properties with fallbacks:

    ```ts
    protected getStyles(): string {
      return `
        :host { display: block; }
        .widget-inner { padding: var(--spacing-md, 1rem); }
        .widget-title { color: var(--color-text, #1f2937); }
      `;
    }
    ```

3.  No `registerLightStyle` needed — shadow CSS is self-contained.

4.  Add a **minimal host-element style key** in `default-styles.ts`:

    ```ts
    'ux-widget': 'block p-4 min-h-48',
    ```

---

## Style key lifecycle

```
default-styles.ts  (core, structural)
        ↓
registerStyles(DEFAULT_STYLES)         ← context-builder.ts
        ↓
registerStyles(TAILWIND_STYLES)         ← plugin-tailwind-css (overrides)
        ↓
applyStyles(root)                        ← during hydration + view mount
```

Plugins append, never delete.  Order guarantees:  boot → core → plugins.

---

## Anti-patterns

- **Don't hardcode colours.**  Use `var(--color-*, fallback)` in every CSS block.
- **Don't call `document.head.appendChild` directly.**  Use `registerLightStyle`.
- **Don't put visual classes in core `default-styles.ts`.**  Core is structural.
    Colours, borders, shadows, radii belong in the plugin's `TAILWIND_STYLES` map.
- **Don't register custom elements in `onConnected`.**  Do it at module level
    so `registerBuiltInPrimitives` can define them before any template renders.
