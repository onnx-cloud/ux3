# Content Guide

Use UX3 content support to publish markdown-backed pages with frontmatter metadata, then render them through views.

This guide focuses on developer and author workflow.

---

## What Content Support Provides

- Markdown files with frontmatter
- Build-time content manifest generation
- Route registration for content entries
- Runtime content service for view rendering

This lets you manage docs/pages as content while keeping UX3 routing and state patterns.

---

## Content File Structure

Place markdown under your project content directory.

Typical fields in frontmatter:

- `title`
- `slug`
- `path`
- `date`
- `description`
- `tags`
- `draft`

Example markdown:

```md
---
title: About UX3
slug: about
path: /about
description: Learn about UX3
date: 2026-04-21
---

# About

UX3 helps teams build declarative, FSM-driven applications.
```

If `slug` is omitted, filename is used.

---

## Content View Pattern

Define a content view state that invokes the content service.

```yaml
name: content
states:
  viewing:
    template: content.html
    invoke:
      service: content
      method: load
```

Render frontmatter + html in template:

```html
<div ux-state="content.viewing">
  <article ux-style="article">
    <h1>{{this.frontmatter.title}}</h1>
    {{#if this.frontmatter.date}}
      <time datetime="{{this.frontmatter.date}}">{{this.frontmatter.date}}</time>
    {{/if}}
    {{{this.html}}}
  </article>
</div>
```

Use sanitized HTML only for markdown output.

---

## Routing Content

Content routes are created from frontmatter path or slug.

- Preferred: set explicit `path` in frontmatter
- Fallback: slug-based route like `/about`

Keep paths stable once published.

---

## i18n and Content

For multilingual content:

- Keep UI chrome (buttons, labels, nav) in i18n files
- Keep body copy in markdown content entries
- If needed, split content by locale folders or locale-specific slugs/paths

Recommended split:

- i18n: app UI strings
- content: authored page/document text

---

## Authoring Rules

- Keep frontmatter minimal and consistent
- Use unique slugs
- Avoid unsafe inline HTML in markdown
- Mark incomplete content with `draft: true`

---

## Validation and Build

Run build/validation before publishing:

```bash
npm run build
```

Check for:

- duplicate slugs
- invalid frontmatter fields
- broken routes
- missing templates

---

## Testing Content Flows

Add tests for:

- content route resolution
- content view rendering
- draft exclusion behavior
- frontmatter-driven metadata rendering

For user confidence, include e2e tests for key content pages.
