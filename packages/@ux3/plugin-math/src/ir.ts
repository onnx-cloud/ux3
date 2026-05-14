export type SemanticId = string;

export interface SourceRange {
  start: number;
  end: number;
}

export interface MathNodeBase {
  id: SemanticId;
  kind: string;
  source: string;
  range: SourceRange;
  provenance?: {
    origin: 'source' | 'normalize' | 'parse';
    description?: string;
  };
}

export interface MathNumberNode extends MathNodeBase {
  kind: 'number';
  value: string;
}

export interface MathIdentifierNode extends MathNodeBase {
  kind: 'identifier';
  name: string;
}

export interface MathOperatorNode extends MathNodeBase {
  kind: 'operator';
  operator: string;
  operands: MathNode[];
}

export interface MathFunctionNode extends MathNodeBase {
  kind: 'function';
  name: string;
  args: MathNode[];
}

export interface MathFractionNode extends MathNodeBase {
  kind: 'fraction';
  numerator: MathNode;
  denominator: MathNode;
}

export interface MathSuperscriptNode extends MathNodeBase {
  kind: 'superscript';
  base: MathNode;
  exponent: MathNode;
}

export interface MathSubscriptNode extends MathNodeBase {
  kind: 'subscript';
  base: MathNode;
  subscript: MathNode;
}

export interface MathGroupNode extends MathNodeBase {
  kind: 'group';
  expression: MathNode;
}

export interface MathRelationNode extends MathNodeBase {
  kind: 'relation';
  relation: string;
  left: MathNode;
  right: MathNode;
}

export type MathNode =
  | MathNumberNode
  | MathIdentifierNode
  | MathOperatorNode
  | MathFunctionNode
  | MathFractionNode
  | MathSuperscriptNode
  | MathSubscriptNode
  | MathGroupNode
  | MathRelationNode;

export type MathIR = {
  root: MathNode;
  source: string;
};
