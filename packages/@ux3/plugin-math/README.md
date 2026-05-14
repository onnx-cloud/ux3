# @ux3/plugin-math

Semantic math support for UX3.

## Features

- TeX-lite inline and block math parsing
- Canonical semantic math IR with stable node IDs
- Normalization for commutative and associative operators
- Round-trip TeX-lite serialization
- HTML and MathML emitters from the IR
- Zero-dependency parser using recursive-descent logic

## Usage

```ts
import MathPlugin, { MathPluginUtils } from '@ux3/plugin-math';

// register plugin in UX3 app
app.register(MathPlugin);

const math = app.utils.math as MathPluginUtils;
const root = math.parse('a + b');
const normalized = math.normalize(root);
const tex = math.serialize(normalized);
const html = math.renderHtml(normalized);
const mathml = math.renderMathML(normalized);
```

## Supported syntax

- numbers: `1`, `3.14`
- identifiers: `x`, `theta`
- operators: `+`, `-`, `*`, `/`, `=`, `<`, `>`, `\le`, `\ge`, `\neq`
- functions: `\sin`, `\cos`, `\log`, `\sqrt`, `\exp`
- fractions: `\frac{a}{b}`
- subscripts/superscripts: `x_1`, `x^2`, `x_{1}^{2}`
- implicit multiplication: `2x`, `x(1+y)`

## Notes

The plugin produces a recoverable semantic IR. Currenly the parser is intentionally limited to a compact TeX-lite syntax and does not support full LaTeX macro expansion.
