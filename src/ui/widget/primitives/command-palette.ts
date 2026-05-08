import { UxBase } from './base.js';

export class UxCommandPalette extends UxBase {
  private input!: HTMLInputElement;
  private list!: HTMLDivElement;
  private results: Array<{ label: string; group?: string }> = [];
  private selected = -1;

  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: none; justify-content: center; padding-top: 15vh; }
        :host([open]) { display: flex; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 9999; }
        .palette {
          width: 560px; max-height: 400px;
          background: white; border-radius: 0.75rem;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          display: flex; flex-direction: column; overflow: hidden;
        }
        input {
          padding: 1rem; border: none; border-bottom: 1px solid #e5e7eb;
          font-size: 1rem; outline: none; width: 100%; box-sizing: border-box;
        }
        .results { flex: 1; overflow-y: auto; }
        .item {
          padding: 0.75rem 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
        }
        .item:hover, .item.selected { background: #f3f4f6; }
        .group { padding: 0.5rem 1rem; font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
      </style>
      <div class="palette" role="dialog" aria-label="Command palette">
        <input type="text" placeholder="Search commands...">
        <div class="results"></div>
      </div>
    `;

    this.input = this.shadowRoot!.querySelector('input')!;
    this.list = this.shadowRoot!.querySelector('.results')!;

    this.input.addEventListener('input', () => this.filter());
    this.input.addEventListener('keydown', (e) => this.onKey(e));
    this.shadowRoot!.querySelector('.palette')!.addEventListener('click', (e) => {
      if (e.target === this.shadowRoot!.querySelector('.palette')) this.close();
    });

    this.addEventListener('ux:event', ((e: CustomEvent) => {
      if (e.detail?.action === 'OPEN') this.open();
      if (e.detail?.action === 'CLOSE') this.close();
    }) as EventListener);
  }

  private open(): void {
    this.setAttribute('open', '');
    this.input.focus();
    this.loadItems();
  }

  private close(): void {
    this.removeAttribute('open');
    this.selected = -1;
    this.input.value = '';
  }

  private loadItems(): void {
    this.results = [];
    this.querySelectorAll('[data-command]').forEach((el) => {
      this.results.push({
        label: (el as HTMLElement).dataset.command || el.textContent || '',
        group: (el as HTMLElement).dataset.group
      });
    });
    this.renderResults(this.results);
  }

  private filter(): void {
    const q = this.input.value.toLowerCase();
    const filtered = this.results.filter(r => r.label.toLowerCase().includes(q));
    this.renderResults(filtered);
  }

  private renderResults(items: typeof this.results): void {
    let html = '';
    let lastGroup = '';
    for (const [i, item] of items.entries()) {
      if (item.group && item.group !== lastGroup) {
        html += `<div class="group">${item.group}</div>`;
        lastGroup = item.group;
      }
      html += `<div class="item${i === this.selected ? ' selected' : ''}" data-index="${i}">${item.label}</div>`;
    }
    this.list.innerHTML = html || '<div class="group">No results</div>';
    this.list.querySelectorAll('.item').forEach((el) => {
      el.addEventListener('click', () => this.select(parseInt((el as HTMLElement).dataset.index!, 10)));
    });
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') { e.preventDefault(); this.selected = Math.min(this.selected + 1, this.list.childElementCount - 1); this.filter(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.selected = Math.max(this.selected - 1, 0); this.filter(); }
    else if (e.key === 'Enter' && this.selected >= 0) { e.preventDefault(); this.select(this.selected); }
    else if (e.key === 'Escape') { this.close(); }
  }

  private select(index: number): void {
    const items = this.list.querySelectorAll('.item');
    if (index < 0 || index >= items.length) return;
    const label = (items[index] as HTMLElement).textContent || '';
    this.dispatchEvent(new CustomEvent('ux:event', {
      bubbles: true, composed: true,
      detail: { action: 'SELECT', label, index }
    }));
    this.close();
  }
}
