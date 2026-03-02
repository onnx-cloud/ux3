/**
 * HBS Compiler - Generates JavaScript code from AST
 */

import { ASTNode, BlockNode, InterpolationNode, TextNode, CodeGenContext } from './types.js';

/**
 * Helper function to escape strings in generated code
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export class Compiler {
  /**
   * Compile AST to JavaScript code
   */
  compileToCode(nodes: ASTNode[]): string {
    const ctx: CodeGenContext = {
      usesAsync: false,
      helperNames: new Set(),
      varCounter: 0,
    };

    const code = this.compileNodes(nodes, ctx);

    // Wrap in template function
    return `
function render(context = {}) {
  const escapeHtml = (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return String(text || '').replace(/[&<>"']/g, char => map[char]);
  };

  const getPath = (ctx, path) => {
    if (!path) return ctx;
    return path.split('.').reduce((v, key) => v?.[key], ctx);
  };

  const isTruthy = (val) => {
    if (typeof val === 'boolean') return val;
    if (val == null) return false;
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'string') return val.length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return Boolean(val);
  };

  return ${code};
}
`;
  }

  /**
   * Compile a sequence of nodes
   */
  private compileNodes(nodes: ASTNode[], ctx: CodeGenContext): string {
    const parts: string[] = [];

    for (const node of nodes) {
      const code = this.compileNode(node, ctx);
      if (code) {
        parts.push(code);
      }
    }

    if (parts.length === 0) {
      return '``';
    }

    return '`' + parts.map(p => {
      // Remove backticks if present
      if (p.startsWith('`') && p.endsWith('`')) {
        return p.slice(1, -1);
      }
      return p;
    }).join('') + '`';
  }

  /**
   * Compile a single node
   */
  private compileNode(node: ASTNode, ctx: CodeGenContext): string {
    switch (node.type) {
      case 'text': {
        const text = (node).value;
        return escapeString(text);
      }

      case 'interpolation': {
        const iNode = node;
        const path = iNode.path;
        const safe = iNode.safe;

        const accessor = `getPath(context, '${path}')`;
        const stringified = `String(${accessor} ?? '')`;
        const escaped = safe ? stringified : `escapeHtml(${stringified})`;

        return `\${${accessor} !== undefined && ${accessor} !== null ? ${escaped} : ''}`;
      }

      case 'block': {
        const bNode = node;
        return this.compileBlock(bNode, ctx);
      }

      default:
        return '';
    }
  }

  /**
   * Compile a block node
   */
  private compileBlock(block: BlockNode, ctx: CodeGenContext): string {
    const { name, expression, body, inverse } = block;

    if (name === 'if') {
      const condition = `isTruthy(getPath(context, '${expression}'))`;
      const trueBranch = this.compileNodes(body, ctx);
      const falseBranch = inverse ? this.compileNodes(inverse, ctx) : '``';

      return `\${${condition} ? ${trueBranch} : ${falseBranch}}`;
    }

    if (name.startsWith('^')) {
      // Inverse block
      const condition = `isTruthy(getPath(context, '${expression}'))`;
      const falseBranch = this.compileNodes(body, ctx);
      const trueBranch = inverse ? this.compileNodes(inverse, ctx) : '``';

      return `\${!${condition} ? ${falseBranch} : ${trueBranch}}`;
    }

    if (name === 'each') {
      const array = `getPath(context, '${expression}')`;
      const code = this.compileNodes(body, ctx);

      return `\${
        Array.isArray(${array}) ? ${array}.map((item, idx) => {
          const itemCtx = { ...context, this: item, '@index': idx };
          return ${code};
        }).join('')
        : ${inverse ? this.compileNodes(inverse, ctx) : '``'}
      }`;
    }

    // For unhandled blocks, just render the body
    return this.compileNodes(body, ctx);
  }
}
