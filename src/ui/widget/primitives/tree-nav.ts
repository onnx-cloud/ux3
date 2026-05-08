import { UxBase } from './base.js';

export class UxTreeNav extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.setAttribute('role', 'tree');

    const buildTree = (parent: Element): string => {
      let html = '<ul role="group">';
      for (const child of parent.children) {
        if (child.tagName !== 'LI' && child.tagName !== 'UX-TREE-ITEM') continue;
        const expanded = child.hasAttribute('expanded') ? ' aria-expanded="true"' : '';
        const label = child.getAttribute('label') || child.querySelector('span')?.textContent || child.textContent || '';
        const nested = Array.from(child.children).some(c => c.tagName === 'UL' || c.tagName === 'LI' || c.tagName === 'UX-TREE-ITEM');
        html += `<li role="treeitem"${expanded}>
          <span class="label" tabindex="0">${nested ? '<span class="toggle">\u25B6</span>' : ''}${label}</span>
          ${nested ? buildTree(child) : ''}
        </li>`;
      }
      html += '</ul>';
      return html;
    };

    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; }
        ul { list-style: none; padding-left: 1.25rem; margin: 0; }
        li { user-select: none; }
        .label { display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; border-radius: 0.25rem; cursor: pointer; }
        .label:hover { background: #f3f4f6; }
        li[aria-expanded="false"] > ul { display: none; }
        li[aria-expanded="true"] > .label > .toggle { transform: rotate(90deg); }
        .toggle { font-size: 0.625rem; transition: transform 0.15s; display: inline-block; width: 1rem; text-align: center; }
      </style>
      ${buildTree(this)}
    `;

    this.shadowRoot!.querySelectorAll('.label').forEach((label) => {
      label.addEventListener('click', () => {
        const li = label.parentElement!;
        const isExpandable = li.querySelector('ul');
        if (isExpandable) {
          const next = li.getAttribute('aria-expanded') !== 'true';
          if (next) li.setAttribute('aria-expanded', 'true');
          else li.removeAttribute('aria-expanded');
        }
        this.dispatchEvent(new CustomEvent('ux:event', {
          bubbles: true, composed: true,
          detail: { action: 'SELECT', label: (label.textContent || '').replace(/[\u25B6\u25BC]/, '').trim() }
        }));
      });
    });
  }
}
