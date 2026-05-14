import type { MathNode } from './ir.js';

const OPERATOR_SYMBOLS: Record<string, string> = {
  '+': '+',
  '-': '-',
  '*': '\\cdot',
  '/': '/',
  '=': '=',
  '<': '<',
  '>': '>',
  '\\le': '\\le',
  '\\ge': '\\ge',
  '\\neq': '\\neq',
};

const OPERATOR_PRECEDENCE: Record<string, number> = {
  '=': 10,
  '<': 10,
  '>': 10,
  '\\le': 10,
  '\\ge': 10,
  '\\neq': 10,
  '+': 20,
  '-': 20,
  '*': 30,
  '/': 30,
};

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

function mathmlEscape(value: string): string {
  return escapeHtml(value);
}

function wrapIfNeeded(value: string, childPrecedence: number, parentPrecedence: number): string {
  return childPrecedence < parentPrecedence ? `(${value})` : value;
}

function getPrecedence(node: MathNode): number {
  switch (node.kind) {
    case 'operator':
      return OPERATOR_PRECEDENCE[node.operator] ?? 20;
    case 'relation':
      return 10;
    case 'function':
      return 40;
    case 'fraction':
      return 40;
    case 'superscript':
    case 'subscript':
      return 50;
    case 'group':
      return 60;
    default:
      return 70;
  }
}

function serializeMathNodeRecursive(node: MathNode, parentPrecedence = 0): string {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'identifier':
      return node.name;
    case 'operator': {
      const symbol = OPERATOR_SYMBOLS[node.operator] ?? node.operator;
      if (node.operator === '/') {
        return `\\frac{${serializeMathNodeRecursive(node.operands[0])}}{${serializeMathNodeRecursive(node.operands[1])}}`;
      }
      const precedence = getPrecedence(node);
      const items = node.operands.map((operand) => {
        return wrapIfNeeded(serializeMathNodeRecursive(operand, precedence), getPrecedence(operand), precedence);
      });
      return items.join(` ${symbol} `);
    }
    case 'function': {
      const args = node.args.map((arg) => `\{${serializeMathNodeRecursive(arg)}\}`).join('');
      return `\\${node.name}${args}`;
    }
    case 'fraction':
      return `\\frac{${serializeMathNodeRecursive(node.numerator)}}{${serializeMathNodeRecursive(node.denominator)}}`;
    case 'superscript':
      return `${wrapIfNeeded(serializeMathNodeRecursive(node.base, 50), getPrecedence(node.base), 50)}^{${serializeMathNodeRecursive(node.exponent)}}`;
    case 'subscript':
      return `${wrapIfNeeded(serializeMathNodeRecursive(node.base, 50), getPrecedence(node.base), 50)}_{${serializeMathNodeRecursive(node.subscript)}}`;
    case 'group':
      return `(${serializeMathNodeRecursive(node.expression)})`;
    case 'relation': {
      const symbol = OPERATOR_SYMBOLS[node.relation] ?? node.relation;
      return `${serializeMathNodeRecursive(node.left)} ${symbol} ${serializeMathNodeRecursive(node.right)}`;
    }
    default:
      return '';
  }
}

export function serializeMathNode(node: MathNode): string {
  return serializeMathNodeRecursive(node);
}

function renderHtmlNode(node: MathNode): string {
  switch (node.kind) {
    case 'number':
      return `<span class="math-number">${escapeHtml(node.value)}</span>`;
    case 'identifier':
      return `<span class="math-identifier">${escapeHtml(node.name)}</span>`;
    case 'operator': {
      const symbol = OPERATOR_SYMBOLS[node.operator] ?? node.operator;
      return `<span class="math-operator">${node.operands
        .map((operand) => renderHtmlNode(operand))
        .join(`<span class="math-symbol"> ${escapeHtml(symbol)} </span>`)}</span>`;
    }
    case 'function': {
      return `<span class="math-function"><span class="math-fn-name">${escapeHtml(node.name)}</span><span class="math-fn-args">${node.args
        .map((arg) => renderHtmlNode(arg))
        .join('<span class="math-fn-separator">,</span>')}</span></span>`;
    }
    case 'fraction':
      return `<span class="math-fraction"><span class="math-numerator">${renderHtmlNode(node.numerator)}</span><span class="math-denominator">${renderHtmlNode(node.denominator)}</span></span>`;
    case 'superscript':
      return `<span class="math-superscript">${renderHtmlNode(node.base)}<sup>${renderHtmlNode(node.exponent)}</sup></span>`;
    case 'subscript':
      return `<span class="math-subscript">${renderHtmlNode(node.base)}<sub>${renderHtmlNode(node.subscript)}</sub></span>`;
    case 'group':
      return `<span class="math-group">(${renderHtmlNode(node.expression)})</span>`;
    case 'relation': {
      const symbol = OPERATOR_SYMBOLS[node.relation] ?? node.relation;
      return `<span class="math-relation">${renderHtmlNode(node.left)}<span class="math-symbol"> ${escapeHtml(symbol)} </span>${renderHtmlNode(node.right)}</span>`;
    }
    default:
      return '';
  }
}

export function renderMathHtml(node: MathNode): string {
  return `<span class="math-expression">${renderHtmlNode(node)}</span>`;
}

function renderMathMLNode(node: MathNode): string {
  switch (node.kind) {
    case 'number':
      return `<mn>${mathmlEscape(node.value)}</mn>`;
    case 'identifier':
      return `<mi>${mathmlEscape(node.name)}</mi>`;
    case 'operator': {
      const symbol = OPERATOR_SYMBOLS[node.operator] ?? node.operator;
      if (node.operator === '/') {
        return `<mfrac>${renderMathMLNode(node.operands[0])}${renderMathMLNode(node.operands[1])}</mfrac>`;
      }
      return `<mrow>${node.operands
        .map((operand, index) => `${renderMathMLNode(operand)}<mo>${mathmlEscape(symbol)}</mo>`)
        .join('')}`.replace(/<mo>.*<\/mo>$/, '') + '</mrow>';
    }
    case 'function': {
      const args = node.args.map(renderMathMLNode).join('<mo>,</mo>');
      if (node.name === 'sqrt' && node.args.length === 1) {
        return `<msqrt>${renderMathMLNode(node.args[0])}</msqrt>`;
      }
      return `<mrow><mi>${mathmlEscape(node.name)}</mi><mo>&#x2061;</mo>${args}</mrow>`;
    }
    case 'fraction':
      return `<mfrac>${renderMathMLNode(node.numerator)}${renderMathMLNode(node.denominator)}</mfrac>`;
    case 'superscript':
      return `<msup>${renderMathMLNode(node.base)}${renderMathMLNode(node.exponent)}</msup>`;
    case 'subscript':
      return `<msub>${renderMathMLNode(node.base)}${renderMathMLNode(node.subscript)}</msub>`;
    case 'group':
      return `<mrow><mo>(</mo>${renderMathMLNode(node.expression)}<mo>)</mo></mrow>`;
    case 'relation': {
      const symbol = OPERATOR_SYMBOLS[node.relation] ?? node.relation;
      return `<mrow>${renderMathMLNode(node.left)}<mo>${mathmlEscape(symbol)}</mo>${renderMathMLNode(node.right)}</mrow>`;
    }
    default:
      return '';
  }
}

export function renderMathMathML(node: MathNode): string {
  return `<math xmlns="http://www.w3.org/1998/Math/MathML">${renderMathMLNode(node)}</math>`;
}
