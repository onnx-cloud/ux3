/**
 * HBS (Handlebars-Lite) Type Definitions
 */

/**
 * Context passed to templates
 */
export type TemplateContext = Record<string, any>;

/**
 * Helper function signature
 */
export type HelperFunction = (
  ...args: any[]
) => any | Promise<any>;

/**
 * Block helper signature (receives context and block content)
 */
export type BlockHelperFunction = (
  context: any,
  options: { fn: (ctx?: any) => string | Promise<string>; inverse?: (ctx?: any) => string | Promise<string> },
  ...args: any[]
) => any | Promise<any>;

/**
 * HBS options
 */
export interface HBSOptions {
  helpers?: Record<string, HelperFunction | BlockHelperFunction>;
  partials?: Record<string, string>;
  strict?: boolean;
  escapeNewlines?: boolean;
}

/**
 * Token types for lexer
 */
export enum TokenType {
  TEXT = 'TEXT',
  OPEN_BLOCK = 'OPEN_BLOCK',           // {{#
  OPEN_INVERSE = 'OPEN_INVERSE',       // {{^
  OPEN_PARTIAL = 'OPEN_PARTIAL',       // {{>
  CLOSE = 'CLOSE',                     // {{/
  OPEN = 'OPEN',                       // {{
  OPEN_UNESCAPED = 'OPEN_UNESCAPED',   // {{{
  CLOSE_UNESCAPED = 'CLOSE_UNESCAPED', // }}}
  CLOSE_RAW = 'CLOSE_RAW',             // }}
  CONTENT = 'CONTENT',
  WHITESPACE = 'WHITESPACE',
}

/**
 * Lexer token
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

/**
 * AST node types
 */
export type ASTNode =
  | TextNode
  | InterpolationNode
  | BlockNode
  | PartialNode;

export interface TextNode {
  type: 'text';
  value: string;
}

export interface InterpolationNode {
  type: 'interpolation';
  path: string;
  safe: boolean; // false = escaped, true = raw HTML
  args: string[];
}

export interface BlockNode {
  type: 'block';
  name: string;
  expression: string;
  args: string[];
  body: ASTNode[];
  inverse?: ASTNode[];
}

export interface PartialNode {
  type: 'partial';
  name: string;
}

/**
 * Compiled template function
 */
export type CompiledTemplate = (context?: TemplateContext) => string;

/**
 * Compiled async template function
 */
export type CompiledAsyncTemplate = (context?: TemplateContext) => Promise<string>;

/**
 * Code generation context
 */
export interface CodeGenContext {
  usesAsync: boolean;
  helperNames: Set<string>;
  varCounter: number;
}
