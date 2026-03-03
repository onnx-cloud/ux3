# Markdown in Views

UX3 supports embedding Markdown content directly into views with the `<ux-markdown>` tag. This feature allows you to:

- Use Markdown files for content-heavy views
- Keep content separate from template logic
- Maintain i18n support for multi-language content
- Compile Markdown to HTML at build time (no runtime cost)
- Automatically sanitize HTML for security

## Basic Usage

Reference a markdown file in your view template using the `ux-markdown` tag:

```html
<div class="article-container">
  <ux-markdown ux-src="ux/content/intro.md" />
</div>
```

The markdown file will be:
1. Loaded from `ux/content/intro.md` (relative to project root)
2. Converted to HTML using the `marked` library
3. Sanitized to remove dangerous tags/attributes (XSS protection)
4. Embedded directly into the compiled template

## File Organization

Markdown files can be stored anywhere in your project. Common patterns:

```
project/
├── ux/
│   ├── view/          # View definitions
│   ├── content/       # Markdown content files
│   └── i18n/          # Translations
└── docs/              # Alternative location for markdown
```

## Internationalization

Use the `{lang}` placeholder to support multiple languages:

```html
<ux-markdown ux-src="ux/content/intro.{lang}.md" />
```

This will resolve to:
- `ux/content/intro.en.md` when `lang` is `'en'`
- `ux/content/intro.fr.md` when `lang` is `'fr'`
- etc.

Currently, the default language is `'en'`. Future versions will support dynamic language resolution from the view context.

## Security

All HTML output from Markdown is sanitized using UX3's standard sanitization rules:

- **Allowed tags**: `p`, `br`, `strong`, `em`, `u`, `i`, `b`, `span`, `a`, `ul`, `ol`, `li`, `h1-h6`
- **Allowed attributes**: `class`, `id`, `href`, `title`, `data-*`
- **Blocked tags**: `script`, `iframe`, `object`, `embed`, `style`, `meta`, etc.
- **Blocked attributes**: `onclick`, `onload`, `onerror`, and all event handlers

Inline scripts and dangerous tags are automatically removed.

## Frontmatter

You can include YAML frontmatter in your markdown files:

```markdown
---
title: My Page
author: John Doe
published: 2026-03-04
---

# Content here...
```

The frontmatter is parsed but not currently used in the compiled template. Future versions may support using frontmatter to customize rendering or inject metadata.

## Example

Create a markdown file:

```markdown
# Welcome

This is a **great** place to start!

## Features

- Easy to use
- Markdown support
- Secure by default
```

Reference it in your view template:

```html
<div class="welcome-section">
  <ux-markdown ux-src="ux/content/welcome.md" />
</div>
```

The compiled view will contain the HTML directly, with no runtime overhead.

## Performance

- **Zero runtime cost**: Markdown→HTML conversion happens at build time
- **No dependencies**: The compiled HTML is static, no need for markdown parser in the bundle
- **Inline content**: Markdown HTML is embedded directly in the template, no extra network requests
- **Same build process**: Markdown processing integrates seamlessly with UX3's build pipeline

## Limitations & Future Work

- Currently supports static markdown only (no dynamic interpolation)
- Language resolution is fixed to `'en'` (will be made dynamic in future versions)
- No support for custom markdown extensions or plugins yet
- Markdown cannot contain recursive `<ux-markdown>` tags

See [FIX_MD.md](../../todo/FIX_MD.md) for implementation details and future enhancements.
