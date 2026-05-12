import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-tree-nav-style';
const STYLE_CSS = `    ux-tree-nav { display: block; }
    ux-tree-nav ul { list-style: none; padding-left: 1.25rem; margin: 0; }
    ux-tree-nav li { user-select: none; }
    ux-tree-nav .label { display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; border-radius: 0.25rem; cursor: pointer; }
    ux-tree-nav .label:hover { background: #f3f4f6; }
    ux-tree-nav li[aria-expanded="false"] > ul { display: none; }
    ux-tree-nav li[aria-expanded="true"] > .label > .toggle { transform: rotate(90deg); }
    ux-tree-nav .toggle { font-size: 0.625rem; transition: transform 0.15s; display: inline-block; width: 1rem; text-align: center; }`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export class UxTreeNav extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'tree');
    this.build();
  }

  protected applyData(data: any): void {
    const items = Array.isArray(data) ? data : data?.items;
    if (!Array.isArray(items)) return;
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'group');
    this.buildFromItems(items, ul);
    this.innerHTML = '';
    this.appendChild(ul);
    this.attachHandlers(ul);
  }

  private build(): void {
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'group');
    this.buildTreeLevel(this, ul);
    this.innerHTML = '';
    this.appendChild(ul);
    this.attachHandlers(ul);
  }

  private attachHandlers(ul: HTMLUListElement): void {
    ul.querySelectorAll('.label').forEach((label) => {
      label.addEventListener('click', () => {
        const li = label.parentElement!;
        if (li.querySelector('ul')) {
          const next = li.getAttribute('aria-expanded') !== 'true';
          if (next) li.setAttribute('aria-expanded', 'true');
          else li.setAttribute('aria-expanded', 'false');
        }
        this.dispatchEvent(new CustomEvent('ux:event', {
          bubbles: true, composed: true,
          detail: { action: 'SELECT', label: (label.textContent || '').replace(/[▶▼]/, '').trim() },
        }));
      });
    });
  }

  private buildFromItems(items: any[], target: HTMLUListElement): void {
    for (const item of items) {
      const li = document.createElement('li');
      li.setAttribute('role', 'treeitem');
      const label = typeof item === 'string' ? item : item.label ?? item.title ?? '';
      const children = item.children ?? item.items;
      const labelEl = document.createElement('span');
      labelEl.className = 'label';
      labelEl.tabIndex = 0;
      if (children && children.length) {
        labelEl.innerHTML = '<span class="toggle">▶</span>';
        li.setAttribute('aria-expanded', 'true');
      }
      labelEl.appendChild(document.createTextNode(label));
      li.appendChild(labelEl);
      if (children && children.length) {
        const nestedUl = document.createElement('ul');
        nestedUl.setAttribute('role', 'group');
        this.buildFromItems(children, nestedUl);
        li.appendChild(nestedUl);
      }
      target.appendChild(li);
    }
  }

  private buildTreeLevel(parent: Element, target: HTMLUListElement): void {
    for (const child of Array.from(parent.children)) {
      if (child.tagName !== 'LI' && child.tagName !== 'UX-TREE-ITEM') continue;
      const li = document.createElement('li');
      li.setAttribute('role', 'treeitem');
      if (child.hasAttribute('expanded')) li.setAttribute('aria-expanded', 'true');
      const textLabel = child.getAttribute('label') || child.querySelector('span')?.textContent || child.textContent || '';
      const nested = Array.from(child.children).some(c => c.tagName === 'UL' || c.tagName === 'LI' || c.tagName === 'UX-TREE-ITEM');
      const labelEl = document.createElement('span');
      labelEl.className = 'label';
      labelEl.tabIndex = 0;
      if (nested) labelEl.innerHTML = '<span class="toggle">▶</span>';
      labelEl.appendChild(document.createTextNode(textLabel));
      li.appendChild(labelEl);
      if (nested) {
        const nestedUl = document.createElement('ul');
        nestedUl.setAttribute('role', 'group');
        this.buildTreeLevel(child, nestedUl);
        li.appendChild(nestedUl);
      }
      target.appendChild(li);
    }
  }
}
