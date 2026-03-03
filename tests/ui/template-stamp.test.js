/**
 * Unit tests for Template Stamping Utility
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { stampTemplate, renderTemplateString } from '@ux3/ui/template-stamp';
describe('template-stamp', () => {
    const context = {
        user: {
            id: 1,
            name: 'GitHub Copilot',
            active: true,
        },
        items: [1, 2, 3],
        empty: '',
        nullValue: null,
        html: '<strong>Injection!</strong>'
    };
    describe('renderTemplateString', () => {
        it('replaces simple interpolations', () => {
            const template = 'Hello {{user.name}}!';
            const result = renderTemplateString(template, context);
            expect(result).toBe('Hello GitHub Copilot!');
        });
        it('replaces this.prop interpolations (legacy)', () => {
            const template = 'Hello {{this.user.name}}!';
            const result = renderTemplateString(template, context);
            expect(result).toBe('Hello GitHub Copilot!');
        });
        it('supports numeric and deep values', () => {
            const template = 'ID: {{user.id}}';
            expect(renderTemplateString(template, context)).toBe('ID: 1');
        });
        it('escapes HTML output', () => {
            const template = 'Safe: {{html}}';
            const result = renderTemplateString(template, context);
            expect(result).toBe('Safe: &lt;strong&gt;Injection!&lt;/strong&gt;');
        });
        it('returns empty string for missing paths', () => {
            const template = 'Missing: {{user.email}}';
            expect(renderTemplateString(template, context)).toBe('Missing: ');
        });
        it('replaces multiple occurrences', () => {
            const template = '{{user.name}} ({{user.id}}) is {{user.active}}';
            expect(renderTemplateString(template, context)).toBe('GitHub Copilot (1) is true');
        });
    });
    describe('stampTemplate', () => {
        // Note: This requires JSDOM (provided by Vitest environment)
        let template;
        beforeEach(() => {
            template = document.createElement('template');
        });
        it('stamps text nodes with context', () => {
            template.innerHTML = '<div class="item">Label: {{user.name}}</div>';
            const result = stampTemplate(template, context);
            const div = result.querySelector('.item');
            expect(div?.textContent).toBe('Label: GitHub Copilot');
        });
        it('stamps element attributes with context', () => {
            template.innerHTML = '<div data-id="{{user.id}}" title="Profile of {{user.name}}">User</div>';
            const result = stampTemplate(template, context);
            const div = result.querySelector('div');
            expect(div?.getAttribute('data-id')).toBe('1');
            expect(div?.getAttribute('title')).toBe('Profile of GitHub Copilot');
        });
        it('handles nested elements', () => {
            template.innerHTML = '<div><span>{{user.name}}</span><small>{{user.id}}</small></div>';
            const result = stampTemplate(template, context);
            expect(result.querySelector('span')?.textContent).toBe('GitHub Copilot');
            expect(result.querySelector('small')?.textContent).toBe('1');
        });
        it('preserves non-placeholder text', () => {
            template.innerHTML = '<div>Static text and {{user.name}}</div>';
            const result = stampTemplate(template, context);
            expect(result.querySelector('div')?.textContent).toBe('Static text and GitHub Copilot');
        });
    });
});
//# sourceMappingURL=template-stamp.test.js.map