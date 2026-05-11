import { UxBase } from '@ux3/ui/widget/primitives/base';

interface Filter { id: string; field: string; operator: string; value: string; }

export class UxFilterBuilder extends UxBase {
  private filters: Filter[] = [];

  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  protected applyData(data: any): void {
    if (Array.isArray(data)) {
      this.filters = data.map((f: any, i: number) => ({
        id: f.id || `f${Date.now() + i}`,
        field: f.field || '',
        operator: f.operator || '=',
        value: f.value || '',
      }));
      this.render();
    }
  }

  private add(): void {
    const id = 'f' + Date.now();
    this.filters.push({ id, field: '', operator: '=', value: '' });
    this.render();
    this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, composed: true, detail: { action: 'ADD', id } }));
  }

  private removeFilter(id: string): void {
    this.filters = this.filters.filter(f => f.id !== id);
    this.render();
    this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, composed: true, detail: { action: 'REMOVE', id } }));
  }

  private update(id: string, key: keyof Filter, value: string): void {
    const f = this.filters.find(x => x.id === id);
    if (f) { (f as any)[key] = value; }
    this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, composed: true, detail: { action: 'UPDATE', filters: [...this.filters] } }));
  }

  private render(): void {
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; }
        .list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .filter {
          display: flex; gap: 0.25rem; align-items: center;
          border: 1px solid var(--ux-fb-border, #d1d5db); border-radius: 0.5rem;
          padding: 0.25rem 0.5rem; font-size: 0.875rem; background: var(--ux-fb-bg, #fff);
        }
        select, input {
          border: none; background: transparent; font: inherit; font-size: 0.8125rem;
          outline: none; padding: 0.125rem 0.25rem;
        }
        .remove { background: none; border: none; cursor: pointer; color: #9ca3af; }
        .remove:hover { color: #ef4444; }
        .add {
          padding: 0.375rem 0.75rem; border: 1px dashed var(--ux-fb-border, #d1d5db);
          border-radius: 0.25rem; cursor: pointer; font: inherit; font-size: 0.875rem;
          background: transparent;
        }
      </style>
      <div class="list">
        ${this.filters.map(f => `
          <div class="filter" data-id="${f.id}">
            <input type="text" data-key="field" value="${f.field}" placeholder="field" size="8">
            <select data-key="operator">
              <option value="=" ${f.operator === '=' ? 'selected' : ''}>=</option>
              <option value="!=" ${f.operator === '!=' ? 'selected' : ''}>!=</option>
              <option value=">" ${f.operator === '>' ? 'selected' : ''}>&gt;</option>
              <option value="<" ${f.operator === '<' ? 'selected' : ''}>&lt;</option>
              <option value="contains" ${f.operator === 'contains' ? 'selected' : ''}>contains</option>
            </select>
            <input type="text" data-key="value" value="${f.value}" placeholder="value" size="8">
            <button class="remove">&times;</button>
          </div>
        `).join('')}
        <button class="add">+ Filter</button>
      </div>
    `;

    this.shadowRoot!.querySelector('.add')!.addEventListener('click', () => this.add());
    this.shadowRoot!.querySelectorAll('.filter').forEach(el => {
      const id = (el as HTMLElement).dataset.id!;
      el.querySelector('.remove')!.addEventListener('click', () => this.removeFilter(id));
      el.querySelectorAll('input, select').forEach(input => {
        const htmlInput = input as HTMLInputElement | HTMLSelectElement;
        input.addEventListener('change', () => this.update(id, (htmlInput as HTMLElement).dataset.key as keyof Filter, (htmlInput as HTMLInputElement).value));
      });
    });
  }
}
