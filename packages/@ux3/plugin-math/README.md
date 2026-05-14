# @ux3/plugin-math

Semantic math plugin for UX3 providing TeX-lite parsing and canonical math IR.

## Features

- TeX-lite semantic math parsing
- Canonical math IR with stable nodes
- HTML and MathML rendering
- Normalization and serialization utilities
- Markdown code block math integration

## Installation

```bash
npm install @ux3/plugin-math
```

## Basic Usage

```ts
import MathPlugin from '@ux3/plugin-math';

const app = initializeApp({
  plugins: [MathPlugin],
});
```

## Plugin Usage

- Register the plugin with the UX3 plugin registry.
- Access `app.utils.math` for parser and renderer helpers.
- Use direct exports for utility functions in standalone code.

## API

- `app.utils.math.parse(source)` — parse TeX-lite math into a semantic IR.
- `app.utils.math.normalize(node)` — normalize commutative/associative math structures.
- `app.utils.math.serialize(node)` — serialize the IR back to TeX-lite.
- `app.utils.math.renderHtml(node)` — convert IR to safe HTML.
- `app.utils.math.renderMathML(node)` — convert IR to MathML.
- `parse`, `normalize`, `serialize`, `renderHtml`, `renderMathML` — direct exports.

## Example

```ts
import MathPlugin, { parse, normalize, renderHtml } from '@ux3/plugin-math';

const app = initializeApp({
  plugins: [MathPlugin],
});

const node = parse('x^2 + \frac{a}{b}');
const normalized = normalize(node);
const html = renderHtml(normalized);

console.log(html);
```

## Notes

- The parser supports a compact TeX-lite subset rather than full LaTeX.
- Markdown integrations are available when a markdown service is registered.
