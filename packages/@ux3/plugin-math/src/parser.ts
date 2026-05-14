import type {
  MathFractionNode,
  MathFunctionNode,
  MathGroupNode,
  MathIdentifierNode,
  MathNode,
  MathNodeBase,
  MathNumberNode,
  MathOperatorNode,
  MathRelationNode,
  MathSubscriptNode,
  MathSuperscriptNode,
  SourceRange,
} from './ir.js';

interface MathToken {
  type: 'number' | 'identifier' | 'command' | 'symbol' | 'eof';
  value: string;
  start: number;
  end: number;
}

const BUILT_IN_FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'log',
  'ln',
  'exp',
  'sqrt',
  'max',
  'min',
  'abs',
  'sum',
  'prod',
]);

const COMMAND_OPERATORS: Record<string, string> = {
  '\\cdot': '*',
  '\\times': '*',
  '\\le': '\\le',
  '\\ge': '\\ge',
  '\\neq': '\\neq',
};

const RELATIONS = new Set(['=', '<', '>', '\\le', '\\ge', '\\neq']);
const COMMUTATIVE_OPERATORS = new Set(['+', '*']);

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
  '^': 50,
  '_': 50,
};

const RIGHT_ASSOCIATIVE = new Set(['^', '_']);

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `math:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function canonicalForm(node: MathNode): string {
  switch (node.kind) {
    case 'number':
      return `number(${node.value})`;
    case 'identifier':
      return `id(${node.name})`;
    case 'operator':
      return `op(${node.operator}:${node.operands.map(canonicalForm).join(',')})`;
    case 'function':
      return `fn(${node.name}:${node.args.map(canonicalForm).join(',')})`;
    case 'fraction':
      return `frac(${canonicalForm(node.numerator)}/${canonicalForm(node.denominator)})`;
    case 'superscript':
      return `sup(${canonicalForm(node.base)}^${canonicalForm(node.exponent)})`;
    case 'subscript':
      return `sub(${canonicalForm(node.base)}_${canonicalForm(node.subscript)})`;
    case 'group':
      return `group(${canonicalForm(node.expression)})`;
    case 'relation':
      return `rel(${node.relation}:${canonicalForm(node.left)}:${canonicalForm(node.right)})`;
  }
}

function createBaseNode(kind: string, start: number, end: number, source: string): MathNodeBase {
  return {
    id: '',
    kind,
    source: source.slice(start, end),
    range: { start, end },
    provenance: { origin: 'parse' },
  };
}

function isPrimaryToken(token: MathToken): boolean {
  if (token.type === 'command') {
    return !COMMAND_OPERATORS.hasOwnProperty(token.value);
  }

  return token.type === 'number' || token.type === 'identifier' || token.value === '(' || token.value === '{';
}

class Lexer {
  private pos = 0;
  private readonly input: string;

  constructor(input: string) {
    this.input = input;
  }

  peek(): MathToken {
    this.skipWhitespace();
    if (this.pos >= this.input.length) {
      return { type: 'eof', value: '', start: this.pos, end: this.pos };
    }

    const start = this.pos;
    let index = this.pos;
    const char = this.input[index];

    if (char === '\\') {
      index += 1;
      let value = '\\';
      while (index < this.input.length && /[a-zA-Z]+/.test(this.input[index])) {
        value += this.input[index++];
      }
      return { type: 'command', value, start, end: index };
    }

    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(this.input[index + 1] || ''))) {
      let value = '';
      while (index < this.input.length && /[0-9.]/.test(this.input[index])) {
        value += this.input[index++];
      }
      return { type: 'number', value, start, end: index };
    }

    if (/[a-zA-Z]/.test(char)) {
      let value = '';
      while (index < this.input.length && /[a-zA-Z]/.test(this.input[index])) {
        value += this.input[index++];
      }
      return { type: 'identifier', value, start, end: index };
    }

    index += 1;
    return { type: 'symbol', value: char, start, end: index };
  }

  next(): MathToken {
    const token = this.peek();
    this.pos = token.end;
    return token;
  }

  skipWhitespace(): void {
    while (this.pos < this.input.length && /[ \t\n\r]/.test(this.input[this.pos])) {
      this.pos += 1;
    }
  }
}

function parseSourceRange(start: number, end: number): SourceRange {
  return { start, end };
}

function withNodeSource<T extends MathNodeBase>(node: T, source: string): T {
  node.source = source.slice(node.range.start, node.range.end);
  return node;
}

function parseMathExpression(source: string): MathNode {
  const lexer = new Lexer(source);
  const root = parseExpression(lexer, source, 0);
  const next = lexer.peek();
  if (next.type !== 'eof') {
    throw new Error(`Unexpected token at ${next.start}: ${next.value}`);
  }
  return finalizeMathNode(normalizeMathNode(root), source);
}

function parseExpression(lexer: Lexer, source: string, minPrec: number): MathNode {
  let left = parseUnaryOrPrimary(lexer, source);

  while (true) {
    const token = lexer.peek();
    let operator = token.value;
    let implicit = false;

    if (isPrimaryToken(token) && left) {
      operator = '*';
      implicit = true;
    }

    if (token.type === 'command' && COMMAND_OPERATORS.hasOwnProperty(token.value)) {
      operator = COMMAND_OPERATORS[token.value];
    }

    if (!OPERATOR_PRECEDENCE.hasOwnProperty(operator)) {
      break;
    }

    const prec = OPERATOR_PRECEDENCE[operator];
    if (prec < minPrec) {
      break;
    }

    const isRight = RIGHT_ASSOCIATIVE.has(operator);
    const nextMin = isRight ? prec : prec + 1;
    const opStart = token.start;

    if (!implicit) {
      lexer.next();
    }

    const right = parseExpression(lexer, source, nextMin);
    const range = parseSourceRange(left.range.start, right.range.end);
    left = RELATIONS.has(operator)
      ? makeRelationNode(operator, left, right, range, source)
      : makeOperatorNode(operator, [left, right], range, source);
  }

  return left;
}

function parseUnaryOrPrimary(lexer: Lexer, source: string): MathNode {
  const token = lexer.peek();
  if (token.type === 'symbol' && (token.value === '+' || token.value === '-')) {
    const op = token.value;
    lexer.next();
    const operand = parseUnaryOrPrimary(lexer, source);
    return makeOperatorNode(op, [makeNumberNode('0', token.start, token.end, source), operand], parseSourceRange(token.start, operand.range.end), source);
  }

  return parsePrimary(lexer, source);
}

function parsePrimary(lexer: Lexer, source: string): MathNode {
  const token = lexer.next();

  if (token.type === 'number') {
    return makeNumberNode(token.value, token.start, token.end, source);
  }

  if (token.type === 'identifier' || token.type === 'command') {
    const name = token.type === 'command' ? token.value.slice(1) : token.value;
    const next = lexer.peek();

    if (token.type === 'command' && name === 'frac') {
      const numerator = parseBracketed(lexer, source);
      const denominator = parseBracketed(lexer, source);
      return makeFractionNode(numerator, denominator, parseSourceRange(token.start, denominator.range.end), source);
    }

    if (token.type === 'command' && name === 'sqrt') {
      const radicand = parseBracketed(lexer, source);
      return makeFunctionNode('sqrt', [radicand], parseSourceRange(token.start, radicand.range.end), source);
    }

    if (BUILT_IN_FUNCTIONS.has(name) && isPrimaryToken(next)) {
      const arg = parsePrimary(lexer, source);
      return makeFunctionNode(name, [arg], parseSourceRange(token.start, arg.range.end), source);
    }

    const identifierNode = makeIdentifierNode(name, token.start, token.end, source);
    return parseSubscriptSuperscript(lexer, source, identifierNode);
  }

  if (token.type === 'symbol') {
    if (token.value === '(' || token.value === '{') {
      const expression = parseExpression(lexer, source, 0);
      const closing = lexer.next();
      if ((token.value === '(' && closing.value !== ')') || (token.value === '{' && closing.value !== '}')) {
        throw new Error(`Expected closing ${token.value === '(' ? ')' : '}'} at ${closing.start}`);
      }
      const groupNode = makeGroupNode(expression, parseSourceRange(token.start, closing.end), source);
      return parseSubscriptSuperscript(lexer, source, groupNode);
    }
  }

  throw new Error(`Unexpected token '${token.value}' at ${token.start}`);
}

function parseBracketed(lexer: Lexer, source: string): MathNode {
  const token = lexer.peek();
  if (token.value === '{' || token.value === '(') {
    lexer.next();
    const expression = parseExpression(lexer, source, 0);
    const closing = lexer.next();
    if ((token.value === '{' && closing.value !== '}') || (token.value === '(' && closing.value !== ')')) {
      throw new Error(`Expected closing ${token.value === '{' ? '}' : ')'} at ${closing.start}`);
    }
    return expression;
  }
  return parsePrimary(lexer, source);
}

function parseSubscriptSuperscript(lexer: Lexer, source: string, base: MathNode): MathNode {
  let node = base;
  while (true) {
    const token = lexer.peek();
    if (token.type !== 'symbol' || (token.value !== '^' && token.value !== '_')) {
      break;
    }
    lexer.next();
    const sub = parseBracketed(lexer, source);
    if (token.value === '^') {
      node = makeSuperscriptNode(node, sub, parseSourceRange(node.range.start, sub.range.end), source);
    } else {
      node = makeSubscriptNode(node, sub, parseSourceRange(node.range.start, sub.range.end), source);
    }
  }
  return node;
}

function makeNumberNode(value: string, start: number, end: number, source: string): MathNumberNode {
  return withNodeSource({
    ...createBaseNode('number', start, end, source),
    value,
  }, source) as MathNumberNode;
}

function makeIdentifierNode(name: string, start: number, end: number, source: string): MathIdentifierNode {
  return withNodeSource({
    ...createBaseNode('identifier', start, end, source),
    name,
  }, source) as MathIdentifierNode;
}

function makeOperatorNode(operator: string, operands: MathNode[], range: SourceRange, source: string): MathOperatorNode {
  return withNodeSource({
    ...createBaseNode('operator', range.start, range.end, source),
    operator,
    operands,
  }, source) as MathOperatorNode;
}

function makeFunctionNode(name: string, args: MathNode[], range: SourceRange, source: string): MathFunctionNode {
  return withNodeSource({
    ...createBaseNode('function', range.start, range.end, source),
    name,
    args,
  }, source) as MathFunctionNode;
}

function makeFractionNode(numerator: MathNode, denominator: MathNode, range: SourceRange, source: string): MathFractionNode {
  return withNodeSource({
    ...createBaseNode('fraction', range.start, range.end, source),
    numerator,
    denominator,
  }, source) as MathFractionNode;
}

function makeSuperscriptNode(base: MathNode, exponent: MathNode, range: SourceRange, source: string): MathSuperscriptNode {
  return withNodeSource({
    ...createBaseNode('superscript', range.start, range.end, source),
    base,
    exponent,
  }, source) as MathSuperscriptNode;
}

function makeSubscriptNode(base: MathNode, subscript: MathNode, range: SourceRange, source: string): MathSubscriptNode {
  return withNodeSource({
    ...createBaseNode('subscript', range.start, range.end, source),
    base,
    subscript,
  }, source) as MathSubscriptNode;
}

function makeGroupNode(expression: MathNode, range: SourceRange, source: string): MathGroupNode {
  return withNodeSource({
    ...createBaseNode('group', range.start, range.end, source),
    expression,
  }, source) as MathGroupNode;
}

function makeRelationNode(relation: string, left: MathNode, right: MathNode, range: SourceRange, source: string): MathRelationNode {
  return withNodeSource({
    ...createBaseNode('relation', range.start, range.end, source),
    relation,
    left,
    right,
  }, source) as MathRelationNode;
}

function normalizeMathNode(node: MathNode): MathNode {
  switch (node.kind) {
    case 'operator': {
      const operands = node.operands.map(normalizeMathNode);
      let flat: MathNode[] = [];
      if (COMMUTATIVE_OPERATORS.has(node.operator)) {
        for (const operand of operands) {
          if (operand.kind === 'operator' && operand.operator === node.operator) {
            flat.push(...operand.operands);
          } else {
            flat.push(operand);
          }
        }
        flat.sort((a, b) => canonicalForm(a).localeCompare(canonicalForm(b)));
      } else {
        flat = operands;
      }
      return makeOperatorNode(node.operator, flat, node.range, node.source);
    }
    case 'function':
      return makeFunctionNode(node.name, node.args.map(normalizeMathNode), node.range, node.source);
    case 'fraction':
      return makeFractionNode(normalizeMathNode(node.numerator), normalizeMathNode(node.denominator), node.range, node.source);
    case 'superscript':
      return makeSuperscriptNode(normalizeMathNode(node.base), normalizeMathNode(node.exponent), node.range, node.source);
    case 'subscript':
      return makeSubscriptNode(normalizeMathNode(node.base), normalizeMathNode(node.subscript), node.range, node.source);
    case 'group':
      return makeGroupNode(normalizeMathNode(node.expression), node.range, node.source);
    case 'relation':
      return makeRelationNode(node.relation, normalizeMathNode(node.left), normalizeMathNode(node.right), node.range, node.source);
    case 'number':
    case 'identifier':
      return node;
    default:
      return node;
  }
}

function assignSemanticIds(node: MathNode): MathNode {
  switch (node.kind) {
    case 'number':
    case 'identifier': {
      node.id = hashString(`${node.kind}:${node.source}`);
      return node;
    }
    case 'operator': {
      node.operands = node.operands.map(assignSemanticIds);
      node.id = hashString(`operator:${node.operator}:${node.operands.map((child) => child.id).join(':')}`);
      return node;
    }
    case 'function': {
      node.args = node.args.map(assignSemanticIds);
      node.id = hashString(`function:${node.name}:${node.args.map((arg) => arg.id).join(':')}`);
      return node;
    }
    case 'fraction': {
      node.numerator = assignSemanticIds(node.numerator);
      node.denominator = assignSemanticIds(node.denominator);
      node.id = hashString(`fraction:${node.numerator.id}:${node.denominator.id}`);
      return node;
    }
    case 'superscript': {
      node.base = assignSemanticIds(node.base);
      node.exponent = assignSemanticIds(node.exponent);
      node.id = hashString(`superscript:${node.base.id}:${node.exponent.id}`);
      return node;
    }
    case 'subscript': {
      node.base = assignSemanticIds(node.base);
      node.subscript = assignSemanticIds(node.subscript);
      node.id = hashString(`subscript:${node.base.id}:${node.subscript.id}`);
      return node;
    }
    case 'group': {
      node.expression = assignSemanticIds(node.expression);
      node.id = hashString(`group:${node.expression.id}`);
      return node;
    }
    case 'relation': {
      node.left = assignSemanticIds(node.left);
      node.right = assignSemanticIds(node.right);
      node.id = hashString(`relation:${node.relation}:${node.left.id}:${node.right.id}`);
      return node;
    }
  }
  const exhaustive: never = node;
  return exhaustive;
}

function finalizeMathNode(node: MathNode, source: string): MathNode {
  const normalized = normalizeMathNode(node);
  return assignSemanticIds(normalized);
}

export { parseMathExpression, normalizeMathNode };
