import { describe, expect, it } from 'vitest';
import { MathPlugin } from '@ux3/plugin-math';
import type { MathPluginUtils } from '@ux3/plugin-math';

import { parseMathExpression, normalizeMathNode } from '@ux3/plugin-math/src/parser.js';
import { renderMathHtml, renderMathMathML, serializeMathNode } from '@ux3/plugin-math/src/render.js';

const mathUtils = {
  parse: parseMathExpression,
  normalize: normalizeMathNode,
  serialize: serializeMathNode,
  renderHtml: renderMathHtml,
  renderMathML: renderMathMathML,
} as MathPluginUtils;

describe('@ux3/plugin-math', () => {
  it('parses and normalizes basic operators', () => {
    const node = mathUtils.parse('b + a');
    expect(node.kind).toBe('operator');
    expect(node.operator).toBe('+');
    expect(node.operands).toHaveLength(2);

    const normalized = mathUtils.normalize(node);
    expect(normalized.operator).toBe('+');
    expect(normalized.operands[0].kind).toBe('identifier');
    expect(normalized.operands[0].name).toBe('a');
    expect(normalized.operands[1].name).toBe('b');
  });

  it('generates stable semantic IDs for commutative expressions', () => {
    const expr1 = mathUtils.parse('a + b');
    const expr2 = mathUtils.parse('b + a');
    expect(expr1.id).toBe(expr2.id);
  });

  it('serializes round-trip TeX-lite', () => {
    const node = mathUtils.parse('x^2 + \sin y = \frac{1}{2}');
    const serialized = mathUtils.serialize(node);
    expect(serialized).toContain('x^{2}');
    expect(serialized).toContain('\\sin');
    expect(serialized).toContain('\\frac{1}{2}');
  });

  it('renders HTML and MathML from IR', () => {
    const node = mathUtils.parse('x^2 + \frac{a}{b}');
    const html = mathUtils.renderHtml(node);
    const mathml = mathUtils.renderMathML(node);

    expect(html).toContain('<sup>');
    expect(html).toContain('math-fraction');
    expect(mathml).toContain('<msup>');
    expect(mathml).toContain('<mfrac>');
  });

  it('supports implicit multiplication and grouping', () => {
    const node = mathUtils.parse('2x + (a + b)');
    expect(node.kind).toBe('operator');
    expect(node.operands[0].kind).toBe('operator');
    expect(node.operands[0].operator).toBe('*');
    expect(node.operands[1].kind).toBe('group');
  });
});
