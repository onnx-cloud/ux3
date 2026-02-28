/**
 * HBS Evaluator - Executes AST at runtime
 */

import { ASTNode, BlockNode, InterpolationNode, TextNode, TemplateContext, HelperFunction } from './types.js';
import { builtInHelpers } from './helpers.js';

/**
 * Escapes HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(text || '').replace(/[&<>"']/g, char => map[char]);
}

/**
 * Get value from context using dot-notation path
 */
export function getPath(context: any, path: string): any {
  if (!path || path === '.') return context;

  const parts = path.split('.');
  let val = context;

  for (const part of parts) {
    if (val == null) return undefined;
    val = val[part];
  }

  return val;
}

/**
 * Check if value is truthy (HBS semantics)
 */
export function isTruthy(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (val == null) return false;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') return val.length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val).length > 0;
  return Boolean(val);
}

/**
 * Parse and clean quoted strings
 */
export function unquote(str: string): string {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

/**
 * Parse a helper call expression like "(eq a b)" or "(filter items status)"
 */
export function parseHelperCall(expr: string): { helperName: string; args: string[] } | null {
  const match = expr.match(/^\s*\(\s*(\w+)\s+(.*)\s*\)\s*$/);
  if (!match) return null;

  const helperName = match[1];
  const argsStr = match[2];

  // Parse arguments, handling quoted strings
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];

    if ((char === '"' || char === "'") && (i === 0 || argsStr[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
      }
      current += char;
    } else if (!inQuotes && /\s/.test(char)) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current);
  }

  return { helperName, args };
}

export class Evaluator {
  private context: TemplateContext;
  private helpers: Record<string, HelperFunction>;

  constructor(context: TemplateContext, helpers: Record<string, HelperFunction> = {}) {
    this.context = context;
    this.helpers = { ...builtInHelpers, ...helpers };
  }

  /**
   * Evaluate AST
   */
  evaluate(nodes: ASTNode[], context: TemplateContext = this.context): string {
    return nodes.map(node => this.evaluateNode(node, context)).join('');
  }

  /**
   * Evaluate a single node
   */
  private evaluateNode(node: ASTNode, context: TemplateContext): string {
    switch (node.type) {
      case 'text':
        return (node as TextNode).value;

      case 'interpolation': {
        const iNode = node as InterpolationNode;
        let value = this.evaluateInterpolation(iNode.path, iNode.args, context);

        // HTML escape unless safe (raw HTML)
        if (!iNode.safe && value !== undefined && value !== null) {
          value = escapeHtml(String(value));
        }

        return value !== undefined && value !== null ? String(value) : '';
      }

      case 'block': {
        const bNode = node as BlockNode;
        return this.evaluateBlock(bNode, context);
      }

      default:
        return '';
    }
  }

  /**
   * Evaluate interpolation {{path}} or {{{path}}}
   */
  private evaluateInterpolation(path: string, args: string[], context: TemplateContext): any {
    // Check if it's a helper call
    if (path && this.helpers[path]) {
      const helper = this.helpers[path];
      const evalArgs = args.map(arg => {
        const unquoted = unquote(arg);
        // Try to resolve as path first, otherwise use as string
        const pathValue = getPath(context, unquoted);
        return pathValue !== undefined ? pathValue : unquoted;
      });
      return helper(...evalArgs);
    }

    // Regular path interpolation
    return getPath(context, path);
  }

  /**
   * Evaluate block ({{#if}}, {{#each}}, {{#unless}}, etc)
   */
  private evaluateBlock(block: BlockNode, context: TemplateContext): string {
    const { name, expression, args, body, inverse } = block;

    // Built-in blocks
    if (name === 'if') {
      const condition = this.evaluateCondition(expression, context);
      const nodes = condition ? body : inverse || [];
      return this.evaluate(nodes, context);
    }

    if (name === 'unless' || name.startsWith('^')) {
      // Inverse block (unless)
      const condition = this.evaluateCondition(expression, context);
      const nodes = !condition ? body : inverse || [];
      return this.evaluate(nodes, context);
    }

    if (name === 'each') {
      const array = getPath(context, expression);
      if (!Array.isArray(array) || array.length === 0) {
        return inverse ? this.evaluate(inverse, context) : '';
      }

      let result = '';
      for (let i = 0; i < array.length; i++) {
        const itemContext = {
          ...context,
          this: array[i],
          '@index': i,
          '@first': i === 0,
          '@last': i === array.length - 1,
        };
        result += this.evaluate(body, itemContext);
      }
      return result;
    }

    if (name === 'with') {
      const newContext = getPath(context, expression);
      if (!newContext) {
        return inverse ? this.evaluate(inverse, context) : '';
      }
      return this.evaluate(body, newContext);
    }

    // If no built-in block matched, just render body
    return this.evaluate(body, context);
  }

  /**
   * Evaluate condition (handles helper calls)
   */
  private evaluateCondition(expression: string, context: TemplateContext): boolean {
    // Check if it's a helper call like (eq a b)
    const helperCall = parseHelperCall(expression);
    if (helperCall) {
      const { helperName, args } = helperCall;
      const helper = this.helpers[helperName];
      if (helper) {
        const evalArgs = args.map(arg => {
          const unquoted = unquote(arg);
          const pathValue = getPath(context, unquoted);
          return pathValue !== undefined ? pathValue : unquoted;
        });
        const result = helper(...evalArgs);
        return isTruthy(result);
      }
    }

    // Regular path evaluation
    const val = getPath(context, expression);
    return isTruthy(val);
  }
}
