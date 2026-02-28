/**
 * HBS Parser - Builds AST from tokens
 */

import { Token, TokenType, ASTNode, BlockNode, InterpolationNode, TextNode } from './types.js';

export class Parser {
  private tokens: Token[];
  private position = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Parse tokens into AST
   */
  parse(): ASTNode[] {
    return this.parseNodes();
  }

  /**
   * Parse a sequence of nodes
   */
  private parseNodes(stopAt?: TokenType): ASTNode[] {
    const nodes: ASTNode[] = [];

    while (this.position < this.tokens.length) {
      const token = this.currentToken();
      if (!token) break;

      // Check for stop condition
      if (stopAt && token.type === stopAt) {
        break;
      }

      if (token.type === TokenType.TEXT) {
        nodes.push(this.parseText());
      } else if (token.type === TokenType.OPEN) {
        nodes.push(this.parseInterpolation());
      } else if (token.type === TokenType.OPEN_UNESCAPED) {
        nodes.push(this.parseUnescapedInterpolation());
      } else if (token.type === TokenType.OPEN_BLOCK) {
        nodes.push(this.parseBlock());
      } else if (token.type === TokenType.OPEN_INVERSE) {
        nodes.push(this.parseInverseBlock());
      } else if (token.type === TokenType.CLOSE) {
        // End of a block - stop parsing
        break;
      } else {
        this.advance();
      }
    }

    return nodes;
  }

  /**
   * Parse text node
   */
  private parseText(): TextNode {
    const token = this.expect(TokenType.TEXT);
    return {
      type: 'text',
      value: token.value,
    };
  }

  /**
   * Parse {{...}} interpolation (escaped)
   */
  private parseInterpolation(): InterpolationNode {
    this.expect(TokenType.OPEN);
    const contentToken = this.expect(TokenType.CONTENT);
    this.expect(TokenType.CLOSE_RAW);

    const { path, args } = this.parseExpression(contentToken.value.trim());

    return {
      type: 'interpolation',
      path,
      safe: false,
      args,
    };
  }

  /**
   * Parse {{{...}}} interpolation (unescaped/raw)
   */
  private parseUnescapedInterpolation(): InterpolationNode {
    this.expect(TokenType.OPEN_UNESCAPED);
    const contentToken = this.expect(TokenType.CONTENT);
    this.expect(TokenType.CLOSE_UNESCAPED);

    const { path, args } = this.parseExpression(contentToken.value.trim());

    return {
      type: 'interpolation',
      path,
      safe: true,
      args,
    };
  }

  /**
   * Parse {{#blockName ...}} ... {{/blockName}}
   */
  private parseBlock(): BlockNode {
    this.expect(TokenType.OPEN_BLOCK);
    const contentToken = this.expect(TokenType.CONTENT);
    this.expect(TokenType.CLOSE_RAW);

    const { path: name, args } = this.parseExpression(contentToken.value.trim());

    // The expression is everything after the block name
    // For {{#if show}}, the expression is 'show'
    // For {{#if (eq a b)}}, the expression is '(eq a b)'
    const expression = args.length > 0 ? args.join(' ') : name;

    // Parse body nodes until we hit {{else}} or {{/name}}
    const body = this.parseNodesUntilElseOrClose();

    // Check for {{else}}
    let inverse: ASTNode[] | undefined;
    if (this.currentToken()?.type === TokenType.OPEN) {
      const nextToken = this.peekAhead(1);
      if (nextToken?.type === TokenType.CONTENT && nextToken.value.trim() === 'else') {
        this.advance(); // consume {{
        this.advance(); // consume else
        this.expect(TokenType.CLOSE_RAW);
        
        // Parse inverse (else) body until {{/name}}
        inverse = this.parseNodesUntilElseOrClose();
      }
    }

    // Expect closing {{/blockName}}
    if (this.currentToken()?.type === TokenType.CLOSE) {
      this.advance(); // consume {{/
      const endContent = this.currentToken();
      if (endContent?.type === TokenType.CONTENT) {
        this.advance();
        this.expect(TokenType.CLOSE_RAW);
        const endName = endContent.value.trim();
        if (endName && endName !== name) {
          throw new Error(`Mismatched block closing tag: expected {{/${name}}}, got {{/${endName}}}`);
        }
      }
    }

    return {
      type: 'block',
      name,
      expression,
      args,
      body,
      inverse,
    };
  }

  /**
   * Parse nodes until we hit {{else}} or {{/...}}
   */
  private parseNodesUntilElseOrClose(): ASTNode[] {
    const nodes: ASTNode[] = [];

    while (this.position < this.tokens.length) {
      const token = this.currentToken();
      if (!token) break;

      // Check for {{else}} or {{/...}}
      if (token.type === TokenType.OPEN) {
        const nextToken = this.peekAhead(1);
        if (nextToken?.type === TokenType.CONTENT) {
          const content = nextToken.value.trim();
          if (content === 'else') {
            // This is {{else}}, stop parsing body
            break;
          }
        }
        // Not an else, parse normally
        nodes.push(this.parseInterpolation());
      } else if (token.type === TokenType.CLOSE) {
        // This is {{/...}}, stop parsing
        break;
      } else if (token.type === TokenType.TEXT) {
        nodes.push(this.parseText());
      } else if (token.type === TokenType.OPEN_UNESCAPED) {
        nodes.push(this.parseUnescapedInterpolation());
      } else if (token.type === TokenType.OPEN_BLOCK) {
        nodes.push(this.parseBlock());
      } else if (token.type === TokenType.OPEN_INVERSE) {
        nodes.push(this.parseInverseBlock());
      } else {
        this.advance();
      }
    }

    return nodes;
  }

  /**
   * Peek ahead n tokens
   */
  private peekAhead(n: number): Token | undefined {
    return this.tokens[this.position + n];
  }

  /**
   * Parse {{^blockName ...}} ... {{/blockName}} (inverse/unless)
   */
  private parseInverseBlock(): BlockNode {
    this.expect(TokenType.OPEN_INVERSE);
    const contentToken = this.expect(TokenType.CONTENT);
    this.expect(TokenType.CLOSE_RAW);

    const { path: name, args } = this.parseExpression(contentToken.value.trim());

    // Parse body nodes until {{/name}}
    const body = this.parseNodesUntilElseOrClose();

    // Expect closing {{/blockName}}
    if (this.currentToken()?.type === TokenType.CLOSE) {
      this.advance(); // consume {{/
      const endContent = this.currentToken();
      if (endContent?.type === TokenType.CONTENT) {
        this.advance();
        this.expect(TokenType.CLOSE_RAW);
        const endName = endContent.value.trim();
        if (endName && endName !== name) {
          throw new Error(`Mismatched inverse block closing tag: expected {{/${name}}}, got {{/${endName}}}`);
        }
      }
    }

    return {
      type: 'block',
      name: `^${name}`,
      expression: name,
      args,
      body,
    };
  }

  /**
   * Parse an expression like "path.to.value arg1 arg2"
   */
  private parseExpression(expr: string): { path: string; args: string[] } {
    // Simple split on whitespace, handling quoted strings
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];

      if ((char === '"' || char === "'") && (i === 0 || expr[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
        }
        current += char;
      } else if (!inQuotes && /\s/.test(char)) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    const path = parts[0] || '';
    const args = parts.slice(1);

    return { path, args };
  }

  /**
   * Get current token
   */
  private currentToken(): Token | undefined {
    return this.tokens[this.position];
  }

  /**
   * Expect a token type and advance
   */
  private expect(type: TokenType): Token {
    const token = this.currentToken();
    if (!token || token.type !== type) {
      throw new Error(`Expected token type ${type}, got ${token?.type || 'EOF'}`);
    }
    this.advance();
    return token;
  }

  /**
   * Advance to next token
   */
  private advance(): void {
    this.position++;
  }
}
