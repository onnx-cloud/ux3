# Security & Sanitization

## Overview

XSS (Cross-Site Scripting) is OWASP Top 10 #3. UX3 provides built-in sanitization to prevent injection attacks when rendering user-generated content or external HTML.

**Key protections:**
- HTML escaping for text content
- Dangerous tag/attribute stripping
- Sanitization levels (strict/moderate/relaxed)
- URL validation and sanitization
- ARIA attribute safety

---

## Core Functions

### escapeHtml() — Escape Text

Use for plain text that should display literally:

```typescript
import { escapeHtml } from '@ux3/security';

const userText = '<img src=x onerror="alert(1)">';
const safe = escapeHtml(userText);

// Output: &lt;img src=x onerror=&quot;alert(1)&quot;&gt;
```

**When to use:**
- User-provided text (comments, names, descriptions)
- Template interpolations: `{{ userText }}`
- Content from untrusted sources

**What it does:**
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#39;`

### sanitizeHtml() — Strip Dangerous HTML

Use when you need to allow *some* HTML but remove dangerous elements:

```typescript
import { sanitizeHtml } from '@ux3/security';

const userHtml = `
  <p>Hello <strong>world</strong></p>
  <script>alert('XSS')</script>
`;

const safe = sanitizeHtml(userHtml, { level: 'moderate' });

// Output: <p>Hello <strong>world</strong></p>
// Script tag removed, safe content preserved
```

**Levels:**

| Level | Behavior |
|-------|----------|
| `strict` | Strip all HTML, return text only |
| `moderate` | Keep safe tags (p, strong, em, a, etc.), remove dangerous ones |
| `relaxed` | Allow most tags, remove only script-like attributes |

**Safe tags (moderate):**
- Text: p, br, strong, em, u, i, b, span
- Lists: ul, ol, li
- Headings: h1-h6
- Links: a

**Removed tags (all levels):**
- script, iframe, object, embed, frame, frameset
- meta, link, style

**Removed attributes (all levels):**
- Event handlers: onclick, onload, onerror, onmouseover, etc.
- Dangerous: href with javascript:

### sanitizeUrl() — Validate URLs

Prevent javascript: and data: URLs:

```typescript
import { sanitizeUrl } from '@ux3/security';

sanitizeUrl('https://example.com');         // ✓ Safe
sanitizeUrl('/path/to/page');               // ✓ Safe
sanitizeUrl('javascript:alert(1)');         // ✗ Blocked
sanitizeUrl('data:text/html,<script>');     // ✗ Blocked
```

**Returns:**
- Safe absolute/relative URL as-is
- Empty string for dangerous URLs

---

## Usage Patterns

### User Comments

```typescript
// User-generated text should always be escaped
const comment = {
  text: '<img src=x onerror="alert(1)">',
  author: 'User'
};

// In template:
// <div>{{ escapeHtml(comment.text) }}</div>
// Output: <div>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</div>
```

### Rich Text Editor

```typescript
// User uploads rich HTML from editor
const richContent = `<p>Hello <strong>world</strong></p>
  <script>alert('XSS')</script>`;

const safe = sanitizeHtml(richContent, { 
  level: 'moderate',
  allowedTags: ['p', 'strong', 'em', 'u', 'a'],
  allowedAttrs: ['href', 'title']
});

// Use in view
const sanitized = safe;  // <p>Hello <strong>world</strong></p>
```

### User-Provided Links

```typescript
// Validate href before rendering
const userLink = document.createElement('a');
userLink.href = sanitizeUrl(userProvidedUrl);

if (userLink.href) {
  // URL is safe, render it
  element.appendChild(userLink);
} else {
  // URL was dangerous, skip it
  console.warn('Dangerous URL blocked:', userProvidedUrl);
}
```

### i18n Keys with Variables

```typescript
// Never interpolate user data directly
const greeting = `Hello ${userName}`;  // DANGEROUS!

// Instead, escape at render time
const safe = escapeHtml(`Hello ${userName}`);

// Or use i18n with placeholders
i18n('greeting', { name: escapeHtml(userName) });
```

---

## API Reference

### escapeHtml(text: string): string

Escapes HTML special characters.

```typescript
escapeHtml('<script>alert("XSS")</script>')
// → '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
```

### sanitizeHtml(html: string, options?: SanitizationOptions): string

Removes dangerous tags and attributes from HTML.

```typescript
interface SanitizationOptions {
  level?: 'strict' | 'moderate' | 'relaxed';
  allowedTags?: string[];
  allowedAttrs?: string[];
}

sanitizeHtml('<p>Hi <script>bad</script></p>', {
  level: 'moderate',
  allowedTags: ['p', 'strong'],
  allowedAttrs: ['class']
})
// → '<p>Hi </p>'
```

### sanitizeUrl(url: string): string

Returns safe URL or empty string if dangerous.

```typescript
sanitizeUrl('https://example.com/path?q=search')
// → 'https://example.com/path?q=search'

sanitizeUrl('javascript:alert(1)')
// → ''
```

---

## Best Practices

### 1. Always Escape User Text

```typescript
// ✗ WRONG - XSS vulnerability
element.innerHTML = `<p>${userComment}</p>`;

// ✓ CORRECT - safe escaping
element.innerHTML = `<p>${escapeHtml(userComment)}</p>`;
```

### 2. Default to Escaping

Escaping is the safe default. Only sanitize when you need HTML:

```typescript
// Most of the time, just escape
escapeHtml(userText);

// Only sanitize when HTML is intentional
sanitizeHtml(userRichText, { level: 'moderate' });
```

### 3. Validate URLs

```typescript
// ✗ WRONG
link.href = userUrl;

// ✓ CORRECT
const safeUrl = sanitizeUrl(userUrl);
if (safeUrl) {
  link.href = safeUrl;
}
```

### 4. Use i18n for Messages

```typescript
// ✗ WRONG - interpolated
const msg = `User ${name} logged in`;

// ✓ CORRECT - sanitized
const msg = i18n('auth.logged-in', { name: escapeHtml(name) });
```

### 5. Use Content Security Policy (CSP)

Complement UX3 sanitization with CSP headers:

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https:;
```

### 6. Audit Generated Code

The compiler should warn on unsafe patterns:

```
[WARNING] Template uses innerHTML without sanitization
[WARNING] Untrusted attribute on element
[WARNING] JavaScript URL protocol
```

---

## Template Integration

### Handlebars Escaping

In templates, escaping is automatic via Handlebars:

```html
<!-- User text - automatically escaped -->
<p>{{ userName }}</p>

<!-- Explicitly allow HTML (must be sanitized!) -->
<p>{{{ sanitizeHtml(userHtml) }}}</p>
```

Triple braces `{{{ }}}` bypass escaping—use carefully!

### Directive Sanitization

The `ux-if`, `ux-repeat`, and other directives sanitize by default:

```html
<!-- Safe - ux-if checks equality, no code eval -->
<div ux-if="this.isVisible">Content</div>

<!-- Safe - ux-repeat iterates arrays safely -->
<li ux-repeat="this.items" :item="item">{{ item.name }}</li>
```

---

## Reference

- Source: [src/security/sanitizer.ts](src/security/sanitizer.ts)
- Validator: [src/security/validator.ts](src/security/validator.ts)
- Tests: [src/security/sanitizer.test.ts](src/security/sanitizer.test.ts)
- OWASP: [OWASP Top 10](https://owasp.org/www-project-top-ten/)
