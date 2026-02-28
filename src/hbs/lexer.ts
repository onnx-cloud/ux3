/**
 * HBS Lexer - Tokenizes template strings
 */

import { Token, TokenType } from './types.js';

export class Lexer {
  private input: string;
  private position = 0;
  private line = 1;
  private column = 1;

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize the entire input
   */
  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.position < this.input.length) {
      // Try to match open tags
      if (this.peek(3) === '{{{') {
        tokens.push(this.makeToken(TokenType.OPEN_UNESCAPED, '{{{'));
        this.advance(3);
        // Now read content until }}}
        const content = this.readUntilClose('}}}');
        if (content) {
          tokens.push(this.makeToken(TokenType.CONTENT, content));
        }
        if (this.peek(3) === '}}}') {
          tokens.push(this.makeToken(TokenType.CLOSE_UNESCAPED, '}}}'));
          this.advance(3);
        }
      } else if (this.peek(3) === '{{#') {
        tokens.push(this.makeToken(TokenType.OPEN_BLOCK, '{{#'));
        this.advance(3);
        const content = this.readUntilClose('}}');
        if (content) {
          tokens.push(this.makeToken(TokenType.CONTENT, content));
        }
        if (this.peek(2) === '}}') {
          tokens.push(this.makeToken(TokenType.CLOSE_RAW, '}}'));
          this.advance(2);
        }
      } else if (this.peek(3) === '{{^') {
        tokens.push(this.makeToken(TokenType.OPEN_INVERSE, '{{^'));
        this.advance(3);
        const content = this.readUntilClose('}}');
        if (content) {
          tokens.push(this.makeToken(TokenType.CONTENT, content));
        }
        if (this.peek(2) === '}}') {
          tokens.push(this.makeToken(TokenType.CLOSE_RAW, '}}'));
          this.advance(2);
        }
      } else if (this.peek(3) === '{{>') {
        tokens.push(this.makeToken(TokenType.OPEN_PARTIAL, '{{>'));
        this.advance(3);
        const content = this.readUntilClose('}}');
        if (content) {
          tokens.push(this.makeToken(TokenType.CONTENT, content));
        }
        if (this.peek(2) === '}}') {
          tokens.push(this.makeToken(TokenType.CLOSE_RAW, '}}'));
          this.advance(2);
        }
      } else if (this.peek(3) === '{{/') {
        tokens.push(this.makeToken(TokenType.CLOSE, '{{/'));
        this.advance(3);
        const content = this.readUntilClose('}}');
        if (content) {
          tokens.push(this.makeToken(TokenType.CONTENT, content));
        }
        if (this.peek(2) === '}}') {
          tokens.push(this.makeToken(TokenType.CLOSE_RAW, '}}'));
          this.advance(2);
        }
      } else if (this.peek(2) === '{{') {
        tokens.push(this.makeToken(TokenType.OPEN, '{{'));
        this.advance(2);
        const content = this.readUntilClose('}}');
        if (content) {
          tokens.push(this.makeToken(TokenType.CONTENT, content));
        }
        if (this.peek(2) === '}}') {
          tokens.push(this.makeToken(TokenType.CLOSE_RAW, '}}'));
          this.advance(2);
        }
      } else {
        // Text content (until next tag)
        const text = this.readText();
        if (text) {
          tokens.push(this.makeToken(TokenType.TEXT, text));
        }
      }
    }

    return tokens;
  }

  /**
   * Read content until we hit a closing delimiter
   */
  private readUntilClose(delimiter: string): string {
    let content = '';
    const delimLen = delimiter.length;

    while (this.position < this.input.length) {
      if (this.peek(delimLen) === delimiter) {
        break;
      }
      content += this.input[this.position];
      this.advance(1);
    }

    return content;
  }

  /**
   * Read until we hit an opening tag
   */
  private readText(): string {
    let text = '';

    while (this.position < this.input.length) {
      if (this.peek(2) === '{{') {
        break;
      }
      text += this.input[this.position];
      this.advance(1);
    }

    return text;
  }

  /**
   * Peek n characters ahead
   */
  private peek(n: number = 1): string {
    return this.input.slice(this.position, this.position + n);
  }

  /**
   * Advance position by n characters
   */
  private advance(n: number): void {
    for (let i = 0; i < n; i++) {
      if (this.input[this.position] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.position++;
    }
  }

  /**
   * Create a token
   */
  private makeToken(type: TokenType, value: string): Token {
    return {
      type,
      value,
      line: this.line,
      column: this.column,
    };
  }
}
