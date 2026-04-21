# UX3 Developer and User Guide

This guide is the practical, end-to-end workflow for building a UX3 app.

It covers the core pillars you asked for:

- FSMs
- Events
- Styles
- i18n
- Content

---

## 1. Build a View with an FSM

Create a view YAML with explicit states and transitions.

```yaml
initial: loading
states:
  loading:
    template: view/home/loading.html
    invoke:
      service: home
      method: fetch
    on:
      SUCCESS: ready
      ERROR: error
  ready:
    template: view/home/ready.html
    on:
      REFRESH: loading
  error:
    template: view/home/error.html
    on:
      RETRY: loading
```

Why this matters:

- behavior is explicit
- transitions are testable
- error/retry is predictable

---

## 2. Wire User Actions with Events

In templates, send intent events using `ux-event`.

```html
<button ux-event="REFRESH">{{i18n.actions.refresh}}</button>
<button ux-event="RETRY">{{i18n.actions.retry}}</button>
```

Event flow:

1. user action in template
2. event dispatched to view FSM
3. transition defined in YAML
4. render new state template

Use intent names, not DOM-specific names.

---

## 3. Apply Styles Through Tokens and Compositions

Keep styles declarative and reusable with tokens + `ux-style`.

In template:

```html
<main ux-style="home-main">
  <h1 ux-style="home-title">{{i18n.home.title}}</h1>
</main>
```

In style compositions:

- define reusable style keys
- reference design tokens
- avoid ad-hoc inline style drift

Use styles for visual concerns only; keep behavior in FSM and events.

---

## 4. Localize with i18n

Put UI labels, actions, and feedback text in locale files.

Example locale keys:

```json
{
  "home": {
    "title": "Welcome"
  },
  "actions": {
    "refresh": "Refresh",
    "retry": "Retry"
  },
  "error": {
    "generic": "Something went wrong"
  }
}
```

In templates, bind to keys instead of hardcoded strings.

Benefits:

- translation readiness
- consistent terminology
- easier QA for language coverage

---

## 5. Add Markdown Content

Use content entries for authored pages/docs while keeping app chrome in i18n.

Example content entry:

```md
---
title: Platform Overview
slug: platform-overview
path: /platform-overview
---

# Platform Overview

This page is authored as markdown content.
```

Render it in content view templates via frontmatter and generated html.

Recommended split:

- i18n: UI strings
- content: long-form authored text

---

## 6. Recommended Folder Responsibilities

- `ux/view`: view FSMs and view templates
- `ux/style`: style compositions and visual contracts
- `ux/i18n`: localized UI strings
- `content`: markdown/frontmatter authored pages

---

## 7. Definition of Done Checklist

For each new feature/view:

- FSM states and transitions defined
- User actions mapped to explicit events
- Styles applied through `ux-style` and tokens
- UI text localized in i18n
- Content extracted to markdown when appropriate
- Build and tests pass

---

## 8. Build, Validate, Test

```bash
npm run dev
npm run build
npm run test
```

Run this loop continuously while evolving views and content.

---

## 9. Related Guides

- [FSM Core](fsm-core.md)
- [Events Guide](events.md)
- [Styles](styles.md)
- [i18n](i18n.md)
- [Content Guide](content.md)
- [Testing Guides](testing-guides.md)
