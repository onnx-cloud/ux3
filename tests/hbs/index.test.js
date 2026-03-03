/**
 * HBS Main API Tests
 */
import { describe, it, expect } from 'vitest';
import { HandlebarsLite } from '@ux3/hbs';
describe('HandlebarsLite', () => {
    it('creates instance', () => {
        const hbs = new HandlebarsLite();
        expect(hbs).toBeDefined();
    });
    it('renders simple template', () => {
        const hbs = new HandlebarsLite();
        const result = hbs.render('Hello {{name}}!', { name: 'World' });
        expect(result).toBe('Hello World!');
    });
    it('renders template with HTML escaping', () => {
        const hbs = new HandlebarsLite();
        const result = hbs.render('{{content}}', { content: '<script>alert("xss")</script>' });
        expect(result).toContain('&lt;');
    });
    it('renders raw HTML', () => {
        const hbs = new HandlebarsLite();
        const result = hbs.render('{{{html}}}', { html: '<strong>bold</strong>' });
        expect(result).toBe('<strong>bold</strong>');
    });
    it('compiles template to function', () => {
        const hbs = new HandlebarsLite();
        const renderFn = hbs.compile('Hello {{name}}!');
        const result = renderFn({ name: 'Compiled' });
        expect(result).toBe('Hello Compiled!');
    });
    it('registers custom helpers', () => {
        const hbs = new HandlebarsLite();
        hbs.registerHelper('double', (n) => n * 2);
        const result = hbs.render('{{double value}}', { value: 5 });
        expect(result).toBe('10');
    });
    it('registers helpers via options', () => {
        const hbs = new HandlebarsLite({
            helpers: {
                greet: (name) => `Hello, ${name}!`,
            },
        });
        const result = hbs.render('{{greet name}}', { name: 'Alice' });
        expect(result).toBe('Hello, Alice!');
    });
    it('handles complex templates', () => {
        const hbs = new HandlebarsLite();
        const template = `
      {{#each users}}
        <div class="user">
          <p>{{this.name}} ({{this.age}} years old)</p>
          {{#if this.active}}
            <span class="badge">Active</span>
          {{/if}}
        </div>
      {{/each}}
    `;
        const result = hbs.render(template, {
            users: [
                { name: 'Alice', age: 30, active: true },
                { name: 'Bob', age: 25, active: false },
            ],
        });
        expect(result).toContain('Alice');
        expect(result).toContain('Bob');
        expect(result).toContain('Active');
    });
    it('renders blocks with else', () => {
        const hbs = new HandlebarsLite();
        const template = '{{#if show}}Visible{{else}}Hidden{{/if}}';
        const result1 = hbs.render(template, { show: true });
        expect(result1).toBe('Visible');
        const result2 = hbs.render(template, { show: false });
        expect(result2).toBe('Hidden');
    });
    it('generates code from template', () => {
        const hbs = new HandlebarsLite();
        const code = hbs.generateCode('Hello {{name}}!');
        expect(code).toContain('function render');
        expect(code).toContain('context');
    });
    it('handles nested objects', () => {
        const hbs = new HandlebarsLite();
        const result = hbs.render('{{user.profile.address.city}}', { user: { profile: { address: { city: 'NYC' } } } });
        expect(result).toBe('NYC');
    });
    it('handles empty arrays in each', () => {
        const hbs = new HandlebarsLite();
        const result = hbs.render('{{#each items}}<li>{{this}}</li>{{/each}}', { items: [] });
        expect(result).toBe('');
    });
    it('provides inverse for each block', () => {
        const hbs = new HandlebarsLite();
        const result = hbs.render('{{#each items}}<li>{{this}}</li>{{else}}<li>No items</li>{{/each}}', { items: [] });
        expect(result).toContain('No items');
    });
    it('uses built-in helpers', () => {
        const hbs = new HandlebarsLite();
        // Test uppercase
        let result = hbs.render('{{uppercase text}}', { text: 'hello' });
        expect(result).toBe('HELLO');
        // Test truncate
        result = hbs.render('{{truncate text 5}}', { text: 'hello world' });
        expect(result).toBe('hello...');
        // Test join
        result = hbs.render('{{join items ", "}}', { items: ['a', 'b', 'c'] });
        expect(result).toBe('a, b, c');
    });
    it('handles expressions in helpers', () => {
        const hbs = new HandlebarsLite();
        const result = hbs.render('{{#if (eq status "active")}}Active{{/if}}', { status: 'active' });
        expect(result).toBe('Active');
    });
});
//# sourceMappingURL=index.test.js.map