import { UxBase } from './base.js';

export class UxMegaMenu extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'navigation');
  }

  protected applyData(data: any): void {
    if (!data || !Array.isArray(data)) return;
    this.innerHTML = '';
    const ul = document.createElement('ul');
    ul.style.cssText = 'display:flex;gap:0;list-style:none;margin:0;padding:0;';
    for (const item of data) {
      const li = document.createElement('li');
      const label = item.label || item.title || item.path || '';
      if (item.path) {
        const a = document.createElement('a');
        a.href = item.path;
        a.textContent = label;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          this.dispatchEvent(new CustomEvent('ux:navigate', {
            bubbles: true, composed: true,
            detail: { path: item.path },
          }));
        });
        li.appendChild(a);
      } else {
        li.textContent = label;
      }
      ul.appendChild(li);
    }
    this.appendChild(ul);
  }
}
