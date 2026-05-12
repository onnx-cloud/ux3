# UX Layout Hints

`ux/layout/*.html` defines page shells that wrap stateful views.

## What belongs here

- Shared app chrome near the top of the DOM (header, nav, side rails, footer).
- A single content slot for the active routed view.
- Cross-screen framing, not per-state screen logic.

## Core rule

- Layout is a parent wrapper; the current view state renders inside it.
- Keep layouts composable and shallow at the root (shell first, view content second).
- Use `{{{content}}}` as the handoff point where the active view mounts.
- Prefer UX3 shell primitives (`ux-app-shell`, `ux-topbar`, `ux-sidebar`, `ux-content`) over raw tags for consistent behavior.
- Keep the active mount region as `#ux-content` (typically on `ux-content`) for router/runtime compatibility.
- You may use `<ux-view />` as a shorthand slot; UX3 maps it to `ux-content#ux-content` at runtime.

## When to use a layout

- Use a layout when multiple routes share the same shell.
- Use a view state transition when only screen content changes.
- Do not switch layouts to model intra-view state.

## Reference shape

```html
<div ux-style="app-shell">
  <ux-app-shell>
    <ux-topbar>...</ux-topbar>
    <ux-view class="route-slot" />
  </ux-app-shell>
</div>
```

Equivalent explicit form:

```html
<ux-content id="ux-content" role="main" class="route-slot">
  {{{content}}}
</ux-content>
```
