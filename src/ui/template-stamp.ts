/**
 * Template Stamping Utility - Safe and deterministic stamping of templates with data
 * Used by components to clone and populate templates for lists or slots
 */

import { escapeHtml } from '../security/sanitizer.js';
import { HandlebarsLite } from '../hbs/index.js';

/**
 * Interface for simple template context
 */
export type TemplateContext = Record<string, any>;

/**
 * Stamps an HTMLTemplateElement with the provided context
 * Clones the template content and replaces {{prop}} or {{this.prop}} interpolations
 * 
 * @param template The template element to stamp
 * @param context The data context for interpolation
 * @returns A DocumentFragment containing the stamped nodes
 */
export function stampTemplate(template: HTMLTemplateElement, context: TemplateContext): DocumentFragment {
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const iterator = document.createNodeIterator(fragment, NodeFilter.SHOW_TEXT);
  
  let node: Node | null;
  while ((node = iterator.nextNode())) {
    const textNode = node as Text;
    const originalText = textNode.textContent || '';
    if (originalText.includes('{{')) {
      textNode.textContent = replaceInterpolations(originalText, context);
    }
  }

  // Also process attributes of all elements in the fragment
  const elements = fragment.querySelectorAll('*');
  elements.forEach(element => {
    for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        if (attr.value.includes('{{')) {
            attr.value = replaceInterpolations(attr.value, context);
        }
    }
  });

  return fragment;
}

/**
 * Stamps template with HBS engine (supports full Handlebars syntax)
 * Use this when you need blocks (if/each) and helpers in your templates
 * 
 * @param template The template element to stamp
 * @param context The data context for interpolation
 * @returns A DocumentFragment containing the stamped nodes
 */
export function stampTemplateWithHBS(
  template: HTMLTemplateElement,
  context: TemplateContext
): DocumentFragment {
  const hbs = new HandlebarsLite();
  const html = hbs.render(template.innerHTML, context);
  const fragment = document.createElement('template');
  fragment.innerHTML = html;
  return fragment.content;
}

/**
 * Renders an HTML string with interpolations (for SSR and string-based templates)
 * 
 * @param html The HTML string with {{prop}} placeholders
 * @param context The data context for interpolation
 * @returns The rendered HTML string
 */
export function renderTemplateString(html: string, context: TemplateContext): string {
  return replaceInterpolations(html, context);
}

/**
 * Internal helper to replace {{prop}} and {{this.prop}} with context values
 * Escapes HTML by default for security
 */
function replaceInterpolations(text: string, context: TemplateContext): string {
  return text.replace(/\{\{(?:this\.)?([\w\.]+)\}\}/g, (_, path) => {
    const value = getPathValue(context, path);
    return value !== undefined ? escapeHtml(String(value)) : '';
  });
}

/**
 * Helper to resolve dot-notated paths in context objects
 */
function getPathValue(obj: any, path: string): any {
  return path.split('.').reduce((prev, curr) => {
    return prev && prev[curr] !== undefined ? prev[curr] : undefined;
  }, obj);
}
