# Welcome to the Application

This is a sample **introduction page** that demonstrates **markdown support** in UX3 views.

## Key Features

- Declarative markdown inclusion using `<ux-markdown>` tags
- Markdown files are compiled to HTML at build time
- HTML sanitized for security (XSS protection)
- Support for i18n with `{lang}` placeholders
- Full frontmatter support via YAML

## Usage

Simply reference a markdown file in your template:

```html
<ux-markdown ux-src="path/to/your/file.md" />
```

The markdown will be converted to safe HTML and embedded directly.

---

*This content was generated from a markdown file.*
