import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MathPlugin } from '@ux3/plugin-math';
import type { MathPluginUtils } from '@ux3/plugin-math';
import { parse, normalize, serialize, renderHtml, renderMathML } from '@ux3/plugin-math';

const mathUtils = {
  parse,
  normalize,
  serialize,
  renderHtml,
  renderMathML,
} as MathPluginUtils;

let mockApp: any;

beforeEach(() => {
  delete (MathPlugin as any).config;
  mockApp = {
    config: { plugins: {} },
    utils: {},
  };
});

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
    const node = mathUtils.parse('x^2 + \\sin y = \\frac{1}{2}');
    const serialized = mathUtils.serialize(node);
    expect(serialized).toContain('x^{2}');
    expect(serialized).toContain('\\sin');
    expect(serialized).toContain('\\frac{1}{2}');
  });

  it('renders HTML and MathML from IR', () => {
    const node = mathUtils.parse('x^2 + \\frac{a}{b}');
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
    expect(node.operator).toBe('+');
    const multiply = node.operands.find((operand) => operand.kind === 'operator' && operand.operator === '*');
    const group = node.operands.find((operand) => operand.kind === 'group');
    expect(multiply).toBeDefined();
    expect(group).toBeDefined();
  });

  it('registers math utilities on plugin install', () => {
    MathPlugin.install?.(mockApp);
    expect(mockApp.utils.math).toBeDefined();
    expect(typeof mockApp.utils.math.parse).toBe('function');
    expect(typeof mockApp.utils.math.serialize).toBe('function');
  });

  it('registers markdown math renderers when markdown service is available', () => {
    mockApp.services = {
      markdown: {
        registerCodeBlockRenderer: vi.fn(),
        registerInlineCodeRenderer: vi.fn(),
      },
    };

    MathPlugin.install?.(mockApp);
    expect(mockApp.services.markdown.registerCodeBlockRenderer).toHaveBeenCalledWith('math', expect.any(Function));
    expect(mockApp.services.markdown.registerCodeBlockRenderer).toHaveBeenCalledWith('latex', expect.any(Function));
    expect(mockApp.services.markdown.registerInlineCodeRenderer).toHaveBeenCalledWith('math', expect.any(Function));
    expect(mockApp.services.markdown.registerInlineCodeRenderer).toHaveBeenCalledWith('latex', expect.any(Function));
  });

  it('skips plugin install when both inline and block math are disabled', () => {
    (MathPlugin as any).config = { enableInlineMath: false, enableBlockMath: false };
    MathPlugin.install?.(mockApp);
    expect(mockApp.utils.math).toBeUndefined();
  });
});
