# Template System — HBS Compiler & Rendering

## Overview

UX3 uses Handlebars-like syntax (HBS) for template compilation. Templates support:
- Text interpolation: `{{ expression }}`
- HTML escaping by default
- Conditional rendering: `{{#if}}`
- Loops: `{{#each}}`
- Partials and layout inclusion

Templates compile to JavaScript functions at build time, not runtime.

---

## HBS Syntax

### Text Interpolation

```hbs
<!-- Access context properties -->
<p>Hello {{ name }}!</p>

<!-- Nested properties -->
<p>User: {{ user.profile.name }}</p>

<!-- Arrays -->
<p>Count: {{ items.length }}</p>
```

### Escaped vs Unescaped

```hbs
<!-- Escaped (default) - safe for user content -->
{{ userText }}
<!-- Renders HTML-safe: &lt; becomes &lt; -->

<!-- Unescaped (use carefully!) -->
{{{ html }}}
<!-- Renders raw HTML - only use with sanitized content! -->
```

### Conditionals

```hbs
<!-- if -->
{{#if user.isAdmin}}
  <div>Admin panel</div>
{{/if}}

<!-- else -->
{{#if user.isAdmin}}
  <div>Admin</div>
{{ else }}
  <div>User</div>
{{/if}}

<!-- else if -->
{{#if status === 'loading'}}
  <div>Loading...</div>
{{ else if status === 'error'}}
  <div>Error!</div>
{{ else }}
  <div>Success</div>
{{/if}}
```

### Iteration

```hbs
<!-- each -->
{{#each items}}
  <li>{{ this.name }}</li>
{{/each}}

<!-- with context -->
{{#each items as |item|}}
  <li>{{ item.name }}</li>
{{/each}}

<!-- with index -->
{{#each items as |item, index|}}
  <li>{{ index + 1 }}. {{ item.name }}</li>
{{/each}}
```

### Partials

```hbs
<!-- Include partial template -->
{{> header }}
<main>Content</main>
{{> footer }}
```

### Helpers

```hbs
<!-- Built-in helpers -->
{{ uppercase name }}
{{ lowercase name }}
{{ capitalize name }}

<!-- Safe URL -->
<a href="{{ sanitizeUrl url }}">Link</a>

<!-- Custom helpers -->
{{ customHelper value param1 param2 }}
```

---

## UX3 Extensions

UX3 extends HBS with FSM-specific directives:

### ux-event

```hbs
<!-- Dispatch event on element -->
<button ux-event="CLICK">Click me</button>

<!-- With payload -->
<button ux-event="DELETE" data-id="{{ item.id }}">Delete</button>
```

Compiles to:
```typescript
element.addEventListener('click', () => {
  fsm.send('CLICK');
});
```

### ux-if

```hbs
<!-- Show/hide based on condition -->
<div ux-if="user.isLoggedIn">
  Welcome {{ user.name }}
</div>

<div ux-if="errors.length > 0">
  <p>Please fix errors</p>
</div>
```

### ux-repeat

```hbs
<!-- Iterate with local binding -->
<ul>
  <li ux-repeat="items" :item="item">
    {{ item.name }}
  </li>
</ul>
```

### ux-state

```hbs
<!-- Conditional based on FSM state -->
<div ux-state="loading">Loading...</div>
<div ux-state="loaded">Content</div>
<div ux-state="error">Error!</div>
```

### ux-style

```hbs
<!-- Apply style classes -->
<button ux-style="btn-primary">Submit</button>
<div ux-style="card">Card content</div>
```

---

## Compilation Process

### 1. Lexing

Input template string is tokenized:
```
{{ name }} → TOKEN_INTERPOLATION "name"
<button>   → TOKEN_HTML "<button>"
```

### 2. Parsing

Tokens are parsed into AST:
```
Program
├─ Text "<p>Hello "
├─ Interpolation "name"
├─ Text "</p>"
```

### 3. Code Generation

AST is compiled to JavaScript:
```javascript
function render(context = {}) {
  const name = context.name;
  return `<p>Hello ${escapeHtml(name)}</p>`;
}
```

---

## Compiler API

### Lexer

```typescript
import { Lexer } from '@ux3/hbs';

const lexer = new Lexer();
const tokens = lexer.tokenize('{{ name }}');

// Output:
// [
//   { type: 'INTERPOLATION', value: 'name' },
//   { type: 'EOF' }
// ]
```

### Parser

```typescript
import { Parser } from '@ux3/hbs';

const parser = new Parser();
const ast = parser.parse(tokens);

// Output:
// {
//   type: 'Program',
//   body: [
//     { type: 'Interpolation', expression: 'name' }
//   ]
// }
```

### Compiler

```typescript
import { Compiler } from '@ux3/hbs';

const compiler = new Compiler();
const code = compiler.compileToCode(ast);

// Output:
// function render(context = {}) {
//   return `Hello ${escapeHtml(context.name)}`;
// }
```

---

## Best Practices

### 1. Always Escape User Content

```hbs
<!-- ✓ CORRECT - Escaped by default -->
<p>{{ userComment }}</p>

<!-- ✗ DANGEROUS - Unescaped HTML -->
<p>{{{ userComment }}}</p>
```

### 2. Use Partials for Reusable Components

```hbs
<!-- In view.hbs -->
{{> components/header }}
<main>{{> components/content }}</main>
{{> components/footer }}

<!-- In partials/components/header.hbs -->
<header>
  <h1>{{ title }}</h1>
</header>
```

### 3. Keep Expressions Simple

```hbs
<!-- ✓ GOOD - Simple property access -->
<p>{{ user.name }}</p>

<!-- ✗ AVOID - Complex logic -->
<p>{{ user.profile.settings.notifications.email ? 'On' : 'Off' }}</p>
```

Move complex logic to helpers or context:

```hbs
<!-- ✓ BETTER -->
<p>{{ emailNotificationStatus }}</p>
```

### 4. Use Helpers for Safe Operations

```hbs
<!-- ✓ SAFE - Helper validates URL -->
<a href="{{ sanitizeUrl url }}">{{ label }}</a>

<!-- ✗ UNSAFE - No validation -->
<a href="{{ url }}">{{ label }}</a>
```

---

## Template Context

Templates receive context object with:
- FSM context properties
- Helper functions
- i18n function
- Application state

```typescript
const context = {
  // From FSM
  user: { id: 1, name: 'Alice' },
  items: [{ id: 1, done: false }],
  
  // Helpers
  uppercase: (str) => str.toUpperCase(),
  sanitizeUrl: (url) => /* ... */,
  
  // i18n
  i18n: (key, vars) => /* ... */
};

const html = render(context);
```

---

## Debug Mode

Templates can be compiled with debug output:

```typescript
const compiler = new Compiler({ debug: true });
const code = compiler.compileToCode(ast);

console.log(code);
// Prints generated JavaScript for inspection
```

---

## Reference

- Lexer: [src/hbs/lexer.ts](src/hbs/lexer.ts)
- Parser: [src/hbs/parser.ts](src/hbs/parser.ts)
- Compiler: [src/hbs/compiler.ts](src/hbs/compiler.ts)
- Types: [src/hbs/types.ts](src/hbs/types.ts)
- Example: [examples/iam/ux/view/](examples/iam/ux/view/)
