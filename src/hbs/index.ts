/**
 * HBS (Handlebars-Lite) - Main API
 */

import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { Evaluator } from './evaluator.js';
import { Compiler } from './compiler.js';
import { HBSOptions, TemplateContext, HelperFunction, CompiledTemplate } from './types.js';
import { builtInHelpers } from './helpers.js';

export class HandlebarsLite {
  private options: HBSOptions;
  private helpers: Record<string, HelperFunction>;
  private partials: Record<string, string>;

  constructor(options: HBSOptions = {}) {
    this.options = options;
    this.helpers = { ...builtInHelpers, ...options.helpers };
    this.partials = options.partials || {};
  }

  /**
   * Register a helper
   */
  registerHelper(name: string, fn: HelperFunction): void {
    this.helpers[name] = fn;
  }

  /**
   * Register a partial
   */
  registerPartial(name: string, template: string): void {
    this.partials[name] = template;
  }

  /**
   * Render a template synchronously
   */
  render(template: string, context: TemplateContext = {}): string {
    const lexer = new Lexer(template);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const evaluator = new Evaluator(context, this.helpers);
    return evaluator.evaluate(ast);
  }

  /**
   * Compile a template into a reusable function
   */
  compile(template: string): CompiledTemplate {
    const lexer = new Lexer(template);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const evaluator = new Evaluator({}, this.helpers);

    return (context: TemplateContext = {}) => {
      const e = new Evaluator(context, this.helpers);
      return e.evaluate(ast);
    };
  }

  /**
   * Generate JavaScript code from a template (for build-time compilation)
   */
  generateCode(template: string): string {
    const lexer = new Lexer(template);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const compiler = new Compiler();
    return compiler.compileToCode(ast);
  }
}

// Export key types and classes
export { Lexer, Parser, Evaluator, Compiler };
export type { HBSOptions, TemplateContext, HelperFunction, CompiledTemplate, ASTNode } from './types.js';
