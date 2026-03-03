/**
 * HBS Lexer Tests
 */
import { describe, it, expect } from 'vitest';
import { Lexer } from '@ux3/hbs/lexer';
import { TokenType } from '@ux3/hbs/types';
describe('Lexer', () => {
    it('tokenizes plain text', () => {
        const lexer = new Lexer('hello world');
        const tokens = lexer.tokenize();
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe(TokenType.TEXT);
        expect(tokens[0].value).toBe('hello world');
    });
    it('tokenizes simple interpolation', () => {
        const lexer = new Lexer('{{name}}');
        const tokens = lexer.tokenize();
        expect(tokens).toHaveLength(3);
        expect(tokens[0].type).toBe(TokenType.OPEN);
        expect(tokens[1].type).toBe(TokenType.CONTENT);
        expect(tokens[2].type).toBe(TokenType.CLOSE_RAW);
    });
    it('tokenizes unescaped interpolation', () => {
        const lexer = new Lexer('{{{html}}}');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.OPEN_UNESCAPED);
        expect(tokens[tokens.length - 1].type).toBe(TokenType.CLOSE_UNESCAPED);
    });
    it('tokenizes block open', () => {
        const lexer = new Lexer('{{#if condition}}');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.OPEN_BLOCK);
    });
    it('tokenizes block close', () => {
        const lexer = new Lexer('{{/if}}');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.CLOSE);
    });
    it('tokenizes inverse block', () => {
        const lexer = new Lexer('{{^unless condition}}');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.OPEN_INVERSE);
    });
    it('tokenizes mixed content', () => {
        const lexer = new Lexer('Hello {{name}}, welcome!');
        const tokens = lexer.tokenize();
        expect(tokens).toContainEqual(expect.objectContaining({ type: TokenType.TEXT, value: 'Hello ' }));
        expect(tokens).toContainEqual(expect.objectContaining({ type: TokenType.OPEN }));
        expect(tokens).toContainEqual(expect.objectContaining({ type: TokenType.TEXT, value: ', welcome!' }));
    });
    it('preserves line and column info', () => {
        const lexer = new Lexer('hello {{name}}');
        const tokens = lexer.tokenize();
        expect(tokens[0].line).toBe(1);
        expect(tokens[0].type).toBe('TEXT');
    });
});
//# sourceMappingURL=lexer.test.js.map