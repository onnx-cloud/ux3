import { UxBase } from '../../../../src/ui/widget/primitives/base';

export class UxKanban extends UxBase {
  private columns: KanbanColumn[] = [];
  private cardElements: HTMLElement[] = [];
  private selectedCards: Set<string> = new Set();
  private lastSelectedId = '';

  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });

    if (this._boundDataRef) {
      this.applyData(this._boundDataRef);
    } else {
      this.parseColumnAttr();
      this.loadSlotCards();
    }
  }

  protected applyData(data: KanbanData): void {
    if (data?.columns) {
      this.columns = data.columns;
    } else if (Array.isArray(data)) {
      this.columns = data;
    }
    this.render();
  }

  private parseColumnAttr(): void {
    const names = (this.getAttribute('columns') || 'Todo,In Progress,Done')
      .split(',').map(c => c.trim());
    if (this.columns.length === 0) {
      this.columns = names.map(title => ({ title, cards: [] }));
    }
  }

  private loadSlotCards(): void {
    const slotCards = Array.from(this.querySelectorAll('[data-card]'));
    for (const card of slotCards) {
      const colIdx = parseInt((card as HTMLElement).dataset.col || '0', 10);
      if (colIdx < this.columns.length) {
        this.columns[colIdx].cards.push({
          id: (card as HTMLElement).dataset.card!,
          title: card.textContent?.trim() || '',
        });
      }
    }
    this.render();
  }

  private render(): void {
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          --_kanban-gap: var(--ux-kanban-gap, 1rem);
          --_kanban-col-bg: var(--ux-kanban-col-bg, #f3f4f6);
          --_kanban-card-bg: var(--ux-kanban-card-bg, #fff);
          display: grid;
          grid-template-columns: repeat(${this.columns.length}, 1fr);
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
          border: 2px solid transparent;
          transition: border-color 0.15s;
        }
        .card:active { cursor: grabbing; }
        .card.dragging { opacity: 0.4; }
        .card.selected { border-color: var(--ux-kanban-select, #3b82f6); box-shadow: 0 0 0 1px var(--ux-kanban-select, #3b82f6); }
      </style>
      ${this.columns.map((c, i) => `
        <div class="col" data-col="${i}">
          <div class="col-header">${this.escapeHtml(c.title)}</div>
          <div class="card-list"></div>
        </div>
      `).join('')}
    `;

    this.cardElements = [];
    const lists = this.shadowRoot!.querySelectorAll('.card-list');
    this.columns.forEach((col, colIdx) => {
      const list = lists[colIdx];
      if (!list) return;
      col.cards.forEach((card, cardIdx) => {
        const el = document.createElement('div');
        el.className = 'card' + (this.selectedCards.has(card.id) ? ' selected' : '');
        el.textContent = card.title;
        el.draggable = true;
        el.dataset.card = card.id;
        el.dataset.col = String(colIdx);
        el.dataset.index = String(cardIdx);

        el.addEventListener('click', (e) => this.onCardClick(e, card.id));
        el.addEventListener('dragstart', (e: Event) => this.onDragStart(e as unknown as DragEvent, card.id, colIdx));
        el.addEventListener('dragend', (e: Event) => this.onDragEnd(e as unknown as DragEvent, card.id));

        list.appendChild(el);
        this.cardElements.push(el);
      });
    });

    lists.forEach(list => {
      list.addEventListener('dragover', (e) => { e.preventDefault(); list.classList.add('drag-over'); });
      list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
      list.addEventListener('drop', (e: Event) => this.onDrop(e as unknown as DragEvent, list));
    });
  }

  private onCardClick(e: MouseEvent, cardId: string): void {
    const el = e.currentTarget as HTMLElement;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (this.selectedCards.has(cardId)) {
        this.selectedCards.delete(cardId);
        el.classList.remove('selected');
      } else {
        this.selectedCards.add(cardId);
        el.classList.add('selected');
      }
      this.lastSelectedId = cardId;
    } else if (e.shiftKey && this.lastSelectedId) {
      e.preventDefault();
      this.selectRange(this.lastSelectedId, cardId);
    } else {
      this.selectedCards.clear();
      this.cardElements.forEach(c => c.classList.remove('selected'));
      this.selectedCards.add(cardId);
      el.classList.add('selected');
      this.lastSelectedId = cardId;
    }
    this.dispatchEvent(new CustomEvent('ux:kanban.select', {
      bubbles: true, composed: true,
      detail: { action: 'KANBAN:SELECT', cards: [...this.selectedCards] },
    }));
  }

  private selectRange(fromId: string, toId: string): void {
    const allIds = this.columns.flatMap(c => c.cards.map(card => card.id));
    const from = allIds.indexOf(fromId);
    const to = allIds.indexOf(toId);
    if (from < 0 || to < 0) return;
    const [start, end] = from < to ? [from, to] : [to, from];
    this.selectedCards.clear();
    for (let i = start; i <= end; i++) this.selectedCards.add(allIds[i]);
    this.cardElements.forEach(el => {
      el.classList.toggle('selected', this.selectedCards.has(el.dataset.card!));
    });
  }

  private onDragStart(e: DragEvent, cardId: string, colIdx: number): void {
    const el = e.target as HTMLElement;
    el.classList.add('dragging');
    const movingIds = this.selectedCards.size > 0 && this.selectedCards.has(cardId)
      ? [...this.selectedCards]
      : [cardId];
    e.dataTransfer!.setData('application/json', JSON.stringify({ cards: movingIds, from: colIdx }));
    e.dataTransfer!.effectAllowed = 'move';
  }

  private onDragEnd(_e: DragEvent, cardId: string): void {
    this.cardElements.forEach(el => el.classList.remove('dragging'));
  }

  private onDrop(e: DragEvent, list: Element): void {
    e.preventDefault();
    list.classList.remove('drag-over');
    try {
      const raw = e.dataTransfer!.getData('application/json');
      if (!raw) return;
      const { cards: cardIds, from } = JSON.parse(raw) as { cards: string[]; from: number };
      const toCol = parseInt((list.closest('.col') as HTMLElement)?.dataset.col || '-1', 10);
      if (toCol < 0 || toCol === from) return;

      const fromCol = this.columns[from];
      const toColumn = this.columns[toCol];
      for (const id of cardIds) {
        const idx = fromCol.cards.findIndex(c => c.id === id);
        if (idx >= 0) {
          const [moved] = fromCol.cards.splice(idx, 1);
          toColumn.cards.push(moved);
        }
      }
      this.render();
      this.dispatchEvent(new CustomEvent('ux:kanban.move', {
        bubbles: true, composed: true,
        detail: { action: 'KANBAN:MOVE', cards: cardIds, from: String(from), to: String(toCol) },
      }));
    } catch {}
  }

  setData(data: KanbanData): void {
    this.applyData(data);
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

interface KanbanCard { id: string; title: string; }
interface KanbanColumn { title: string; cards: KanbanCard[]; }
interface KanbanData { columns: KanbanColumn[]; }
