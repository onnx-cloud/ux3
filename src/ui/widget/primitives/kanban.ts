import { UxBase } from './base.js';

export class UxKanban extends UxBase {
  protected onConnected(): void {
    super.onConnected();
    const cols = this.getAttribute('columns')?.split(',').map(c => c.trim()) || ['Todo', 'In Progress', 'Done'];

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          --_kanban-gap: var(--ux-kanban-gap, 1rem);
          --_kanban-col-bg: var(--ux-kanban-col-bg, #f3f4f6);
          --_kanban-card-bg: var(--ux-kanban-card-bg, #fff);
          display: grid;
          grid-template-columns: repeat(${cols.length}, 1fr);
          gap: var(--_kanban-gap);
          min-height: 400px;
          overflow-x: auto;
        }
        .col {
          background: var(--_kanban-col-bg);
          border-radius: 0.5rem;
          padding: 0.75rem;
          display: flex; flex-direction: column; gap: 0.5rem;
        }
        .col-header { font-weight: 600; font-size: 0.875rem; padding: 0 0.25rem; }
        .card-list { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; min-height: 60px; }
        .card-list.drag-over { background: var(--ux-kanban-drag, #dbeafe); border-radius: 0.25rem; }
        .card {
          background: var(--_kanban-card-bg);
          padding: 0.75rem;
          border-radius: 0.375rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          cursor: grab;
          font-size: 0.875rem;
        }
        .card:active { cursor: grabbing; }
        .card.dragging { opacity: 0.4; }
      </style>
      ${cols.map((c, i) => `
        <div class="col" data-col="${i}">
          <div class="col-header">${c}</div>
          <div class="card-list"></div>
        </div>
      `).join('')}
    `;

    // Distribute slotted cards into columns
    const cards = Array.from(this.querySelectorAll('[data-card]'));
    for (const card of cards) {
      const col = parseInt((card as HTMLElement).dataset.col || '0', 10);
      const list = this.shadowRoot!.querySelectorAll('.card-list')[col];
      if (list) {
        const clone = card.cloneNode(true) as HTMLElement;
        clone.classList.add('card');
        clone.draggable = true;
        clone.addEventListener('dragstart', (e) => {
          (e.target as HTMLElement).classList.add('dragging');
          (e as DragEvent).dataTransfer!.setData('text/plain', String(cards.indexOf(card)));
        });
        clone.addEventListener('dragend', (e) => {
          (e.target as HTMLElement).classList.remove('dragging');
        });
        list.appendChild(clone);
      }
    }

    this.shadowRoot!.querySelectorAll('.card-list').forEach(list => {
      list.addEventListener('dragover', (e) => { e.preventDefault(); list.classList.add('drag-over'); });
      list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
      list.addEventListener('drop', (e) => {
        e.preventDefault();
        list.classList.remove('drag-over');
        const cardIdx = parseInt((e as DragEvent).dataTransfer!.getData('text/plain'), 10);
        const toCol = (list.closest('.col') as HTMLElement)?.dataset.col;
        this.dispatchEvent(new CustomEvent('ux:event', {
          bubbles: true, composed: true,
          detail: { action: 'MOVE', card: cards[cardIdx]?.getAttribute('data-card'), from: (cards[cardIdx] as HTMLElement)?.dataset.col, to: toCol }
        }));
      });
    });
  }
}
