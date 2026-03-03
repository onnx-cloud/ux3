/**
 * HBS Evaluator Tests
 */

import { describe, it, expect } from 'vitest';
import { Lexer } from '@ux3/hbs/lexer.ts';
import { Parser } from '@ux3/hbs/parser';
import { Evaluator } from '@ux3/hbs/evaluator';

function renderTemplate(template: string, context = {}): string {
  const lexer = new Lexer(template);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const evaluator = new Evaluator(context);
  return evaluator.evaluate(ast);
}

describe('Evaluator', () => {
  it('renders plain text', () => {
    const result = renderTemplate('hello world');
    expect(result).toBe('hello world');
  });

  it('renders simple interpolation', () => {
    const result = renderTemplate('{{name}}', { name: 'Alice' });
    expect(result).toBe('Alice');
  });

  it('escapes HTML by default', () => {
    const result = renderTemplate('{{content}}', { content: '<script>alert("xss")</script>' });
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('renders raw HTML with triple mustache', () => {
    const result = renderTemplate('{{{html}}}', { html: '<strong>bold</strong>' });
    expect(result).toBe('<strong>bold</strong>');
  });

  it('handles dot-notation paths', () => {
    const context = { user: { name: 'Bob', profile: { age: 30 } } };
    const result = renderTemplate('{{user.name}} is {{user.profile.age}}', context);
    expect(result).toBe('Bob is 30');
  });

  it('handles missing paths', () => {
    const result = renderTemplate('{{missing}}', {});
    expect(result).toBe('');
  });

  it('handles null/undefined gracefully', () => {
    const result = renderTemplate('{{value}}', { value: null });
    expect(result).toBe('');
  });

  it('evaluates {{#if}} blocks', () => {
    const result1 = renderTemplate('{{#if show}}Visible{{/if}}', { show: true });
    expect(result1).toBe('Visible');

    const result2 = renderTemplate('{{#if show}}Visible{{/if}}', { show: false });
    expect(result2).toBe('');
  });

  it('evaluates {{#if}} with else', () => {
    const template = '{{#if show}}Yes{{else}}No{{/if}}';
    const result1 = renderTemplate(template, { show: true });
    expect(result1).toBe('Yes');

    const result2 = renderTemplate(template, { show: false });
    expect(result2).toBe('No');
  });

  it('evaluates {{#each}} blocks', () => {
    const context = { items: ['a', 'b', 'c'] };
    const result = renderTemplate('{{#each items}}<li>{{this}}</li>{{/each}}', context);
    expect(result).toContain('<li>a</li>');
    expect(result).toContain('<li>b</li>');
    expect(result).toContain('<li>c</li>');
  });

  it('provides @index in loops', () => {
    const context = { items: ['x', 'y'] };
    const result = renderTemplate('{{#each items}}{{@index}},{{/each}}', context);
    expect(result).toBe('0,1,');
  });

  it('evaluates {{#unless}} blocks', () => {
    const template = '{{#unless hidden}}Shown{{/unless}}';
    const result1 = renderTemplate(template, { hidden: true });
    expect(result1).toBe('');

    const result2 = renderTemplate(template, { hidden: false });
    expect(result2).toBe('Shown');
  });

  it('truthy evaluation follows HBS semantics', () => {
    // 0, '', [], {}, null, undefined, false are falsy
    const cases = [
      { value: true, expected: 'yes' },
      { value: false, expected: 'no' },
      { value: 1, expected: 'yes' },
      { value: 0, expected: 'no' },
      { value: 'text', expected: 'yes' },
      { value: '', expected: 'no' },
      { value: [1], expected: 'yes' },
      { value: [], expected: 'no' },
      { value: null, expected: 'no' },
      { value: undefined, expected: 'no' },
    ];

    const template = '{{#if value}}yes{{else}}no{{/if}}';

    cases.forEach(({ value, expected }) => {
      const result = renderTemplate(template, { value });
      expect(result).toBe(expected);
    });
  });

  it('uses built-in helpers', () => {
    const result1 = renderTemplate('{{#if (eq role "admin")}}Admin{{/if}}', { role: 'admin' });
    expect(result1).toBe('Admin');

    const result2 = renderTemplate('{{uppercase name}}', { name: 'alice' });
    expect(result2).toBe('ALICE');

    const result3 = renderTemplate('{{truncate text 5 "..."}}', { text: 'hello world' });
    expect(result3).toBe('hello...');
  });

  it('handles numeric interpolation', () => {
    const result = renderTemplate('Count: {{count}}', { count: 42 });
    expect(result).toBe('Count: 42');
  });

  it('handles boolean interpolation', () => {
    const result = renderTemplate('Active: {{active}}', { active: true });
    expect(result).toBe('Active: true');
  });

  it('handles array with object items', () => {
    const context = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
    const result = renderTemplate('{{#each users}}{{this.name}},{{/each}}', context);
    expect(result).toBe('Alice,Bob,');
  });
});
