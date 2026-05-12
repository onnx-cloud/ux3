import { UxBase } from '@ux3/ui/widget/primitives/base';

interface Rule { id: string; field: string; operator: string; value: string; }

export class UxQueryBuilder extends UxBase {
  private rules: Rule[] = [];

  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  protected applyData(data: any): void {
    if (Array.isArray(data)) {
      this.rules = data.map((r: any, i: number) => ({
        id: r.id || `r${Date.now() + i}`,
        field: r.field || '',
        operator: r.operator || '=',
        value: r.value || '',
      }));
      this.render();
    }
  }

  private addRule(): void {
    const id = 'r' + Date.now();
    this.rules.push({ id, field: '', operator: '=', value: '' });
    this.render();
    this.dispatchEvent(new CustomEvent('ux:query.action', { bubbles: true, composed: true, detail: { action: 'ADD', id } }));
  }

  private removeRule(id: string): void {
    this.rules = this.rules.filter(r => r.id !== id);
    this.render();
    this.dispatchEvent(new CustomEvent('ux:query.action', { bubbles: true, composed: true, detail: { action: 'REMOVE', id } }));
  }

  private updateRule(id: string, key: keyof Rule, value: string): void {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      (rule as any)[key] = value;
      this.dispatchEvent(new CustomEvent('ux:query.action', { bubbles: true, composed: true, detail: { action: 'UPDATE', rule: { ...rule } } }));
    }
  }

  private render(): void {
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; }
        .rules { display: flex; flex-direction: column; gap: 0.5rem; }
        .rule { display: flex; gap: 0.5rem; align-items: center; }
        select, input {
          padding: 0.375rem 0.5rem; border: 1px solid var(--ux-qb-border, #d1d5db);
          border-radius: 0.25rem; font: inherit; font-size: 0.875rem;
        }
        select:focus, input:focus { border-color: #3b82f6; outline: none; }
        .remove-btn {
          background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.25rem; padding: 0; line-height: 1;
        }
        .add-btn {
          padding: 0.375rem 0.75rem; background: var(--ux-qb-add, #dbeafe); border: 1px solid var(--ux-qb-add-border, #bfdbfe);
          border-radius: 0.25rem; cursor: pointer; font: inherit; font-size: 0.875rem; align-self: flex-start;
        }
      </style>
      <div class="rules">
        ${this.rules.map(r => `
          <div class="rule" data-id="${r.id}">
            <input type="text" class="field" value="${r.field}" placeholder="field" data-key="field">
            <select class="op" data-key="operator">
              <option value="=" ${r.operator === '=' ? 'selected' : ''}>=</option>
              <option value="!=" ${r.operator === '!=' ? 'selected' : ''}>!=</option>
              <option value=">" ${r.operator === '>' ? 'selected' : ''}>&gt;</option>
              <option value="<" ${r.operator === '<' ? 'selected' : ''}>&lt;</option>
              <option value="contains" ${r.operator === 'contains' ? 'selected' : ''}>contains</option>
            </select>
            <input type="text" class="value" value="${r.value}" placeholder="value" data-key="value">
            <button class="remove-btn">&times;</button>
          </div>
        `).join('')}
      </div>
      <button class="add-btn">+ Add rule</button>
    `;

    this.shadowRoot!.querySelector('.add-btn')!.addEventListener('click', () => this.addRule());

    this.shadowRoot!.querySelectorAll('.rule').forEach(el => {
      const id = (el as HTMLElement).dataset.id!;
      el.querySelector('.remove-btn')!.addEventListener('click', () => this.removeRule(id));
      el.querySelectorAll('input, select').forEach(input => {
        const htmlInput = input as HTMLInputElement | HTMLSelectElement;
        input.addEventListener('change', () => {
          this.updateRule(id, (htmlInput as HTMLElement).dataset.key as keyof Rule, (htmlInput as HTMLInputElement).value);
        });
      });
    });
  }
}
