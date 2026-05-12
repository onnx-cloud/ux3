import { UxBase } from '@ux3/ui/widget/primitives/base';
import { escapeHtml } from '@ux3/security/sanitizer';
import { UX_EVENT } from '@ux3/utils/helpers';

interface GanttTask {
  id: string; label: string; start: Date; end: Date;
  progress?: number; dependencies?: string[];
}

export class UxGantt extends UxBase {
  private tasks: GanttTask[] = [];
  private start: Date = new Date();
  private end: Date = new Date();
  private resizeHandle: { task: string; side: 'left' | 'right' } | null = null;
  private moveHandle: { task: string; startX: number } | null = null;
  private reorderHandle: { task: string; startY: number; fromIndex: number } | null = null;
  private panHandle: { startX: number; scrollLeft: number } | null = null;
  private reorderTarget = -1;
  private _onMove: ((e: MouseEvent) => void) | null = null;
  private _onUp: (() => void) | null = null;
  private _built = false;
  private colWd = 24;

  static get observedAttributes(): string[] {
    return ['col-width'];
  }

  protected onAttributeChanged(name: string, _old: string | null, _nv: string | null): void {
    if (name === 'col-width') {
      const w = parseInt(_nv || '24', 10);
      if (w > 0) { this.colWd = w; this.render(); }
    }
  }

  protected onConnected(): void {
    super.onConnected();
    const cw = parseInt(this.getAttribute('col-width') || '24', 10);
    if (cw > 0) this.colWd = cw;

    if (!this._built) {
      this._built = true;
      this.attachShadow({ mode: 'open' });
    }
    if (this._boundDataRef) {
      this.applyData(this._boundDataRef);
    } else {
      this.loadSlotData();
    }
    this.render();
  }

  protected applyData(data: GanttData): void {
    if (data?.tasks) {
      this.tasks = data.tasks.map(t => ({
        id: t.id,
        label: t.label,
        start: new Date(t.start),
        end: new Date(t.end),
        progress: t.progress,
        dependencies: t.dependencies || [],
      }));
    }
    if (this.tasks.length) {
      this.start = new Date(Math.min(...this.tasks.map(t => t.start.getTime())));
      this.end = new Date(Math.max(...this.tasks.map(t => t.end.getTime())));
    }
    this.render();
  }

  private loadSlotData(): void {
    this.tasks = Array.from(this.querySelectorAll('[data-task]')).map(el => ({
      id: (el as HTMLElement).dataset.task!,
      label: (el as HTMLElement).dataset.label || (el as HTMLElement).dataset.task!,
      start: new Date((el as HTMLElement).dataset.start || Date.now()),
      end: new Date((el as HTMLElement).dataset.end || Date.now() + 86400000 * 3),
      progress: parseFloat((el as HTMLElement).dataset.progress || '0'),
      dependencies: ((el as HTMLElement).dataset.deps || '')
        .split(',').map(d => d.trim()).filter(Boolean),
    }));
    if (this.tasks.length) {
      this.start = new Date(Math.min(...this.tasks.map(t => t.start.getTime())));
      this.end = new Date(Math.max(...this.tasks.map(t => t.end.getTime())));
    }
  }

  protected onDisconnected(): void {
    this.cleanupListeners();
    this.resizeHandle = null;
    this.moveHandle = null;
    this.reorderHandle = null;
    this.panHandle = null;
    super.onDisconnected();
  }

  private cleanupListeners(): void {
    if (this._onMove) { document.removeEventListener('mousemove', this._onMove); this._onMove = null; }
    if (this._onUp) { document.removeEventListener('mouseup', this._onUp); this._onUp = null; }
  }

  private render(): void {
    const totalDays = Math.max(1, Math.ceil((this.end.getTime() - this.start.getTime()) / 86400000));
    const colWd = this.colWd;
    const labelW = 140;
    const todayOffset = this.dayOffset(new Date());

    let header = '';
    const cur = new Date(this.start);
    while (cur <= this.end) {
      header += `<div class="day-cell">${cur.getDate()}/${cur.getMonth() + 1}</div>`;
      cur.setDate(cur.getDate() + 1);
    }

    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; overflow: hidden; }
        .gantt-wrap { display: flex; flex-direction: column; position: relative; }
        .toolbar { display: flex; gap: 0.25rem; padding: 0.25rem 0; }
        .toolbar button { padding: 0.125rem 0.5rem; border: 1px solid var(--ux-gantt-border, #d1d5db); background: var(--ux-gantt-bg, #fff); border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem; }
        .scroll-container { overflow-x: auto; overflow-y: hidden; }
        .gantt { display: flex; flex-direction: column; min-width: ${totalDays * colWd}px; }
        .header-row { display: flex; border-bottom: 1px solid var(--ux-gantt-border, #d1d5db); position: sticky; top: 0; background: var(--ux-gantt-bg, #fff); z-index: 2; }
        .header-label { flex: 0 0 ${labelW}px; padding: 4px 0.5rem; font-size: 0.625rem; font-weight: 600; }
        .day-cell { flex: 0 0 ${colWd}px; padding: 4px 2px; font-size: 0.625rem; text-align: center; border-right: 1px solid var(--ux-gantt-grid, #f3f4f6); }
        .today-line { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--ux-gantt-today, #ef4444); z-index: 1; pointer-events: none; }
        .row { display: flex; align-items: center; border-bottom: 1px solid var(--ux-gantt-grid, #f3f4f6); position: relative; height: 36px; }
        .row-label { flex: 0 0 ${labelW}px; padding: 0 0.5rem; font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: grab; }
        .row-track { flex: 1; position: relative; height: 100%; cursor: grab; }
        .row.reorder-target { background: var(--ux-gantt-reorder-bg, #dbeafe); }
        .row.reorder-before { border-top: 2px solid var(--ux-gantt-reorder-line, #3b82f6); }
        .bar {
          position: absolute; top: 6px; height: 24px;
          background: var(--ux-gantt-bar, #3b82f6);
          border-radius: 4px; cursor: grab;
          display: flex; align-items: center; padding: 0 4px; font-size: 0.625rem; color: white; overflow: hidden;
          min-width: 24px; pointer-events: none;
        }
        .bar::before, .bar::after { content: ''; position: absolute; top: 0; width: 8px; height: 100%; cursor: col-resize; pointer-events: auto; }
        .bar::before { left: 0; }
        .bar::after { right: 0; }
        .bar-progress { position: absolute; top: 0; left: 0; height: 100%; background: rgba(255,255,255,0.25); border-radius: 4px 0 0 4px; pointer-events: none; }
        .bg-grid { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; }
        .bg-day { flex: 0 0 ${colWd}px; border-right: 1px solid var(--ux-gantt-grid, #f3f4f6); }
        .panning { cursor: grabbing !important; }
      </style>
      <div class="gantt-wrap">
        <div class="toolbar">
          <slot name="controls">
            <button data-zoom="-">−</button>
            <button data-zoom="+">+</button>
            <span style="font-size:0.6875rem;color:#64748b;padding:0.125rem 0.25rem;">zoom</span>
          </slot>
        </div>
        <div class="scroll-container">
          <div class="gantt">
            <div class="header-row"><div class="header-label">Task</div>${header}${todayOffset >= 0 ? `<div class="today-line" style="left:${labelW + todayOffset * colWd - 1}px"></div>` : ''}</div>
            ${this.tasks.map((t, i) => {
              const left = this.dayOffset(t.start) * colWd;
              const w = Math.max(24, this.dayOffset(t.end) * colWd - left);
              const progPct = t.progress ? `${Math.min(100, Math.max(0, t.progress))}%` : '0%';
              return `<div class="row" data-row="${i}">
                <div class="row-label" data-row="${i}">${escapeHtml(t.label)}</div>
                <div class="row-track" data-row="${i}">
                  <div class="bg-grid">${Array(Math.ceil(totalDays)).fill(0).map(() => '<div class="bg-day"></div>').join('')}</div>
                  <div class="bar" data-bar="${t.id}" data-row="${i}" style="left:${left}px;width:${w}px">
                    <div class="bar-progress" style="width:${progPct}"></div>${t.label}
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    this.setupZoomButtons();
    this.setupListeners();
  }

  private setupZoomButtons(): void {
    const zoomBtns = this.shadowRoot!.querySelectorAll('[data-zoom]');
    zoomBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const zoom = (btn as HTMLElement).getAttribute('data-zoom')!;
        this.colWd = Math.max(4, Math.min(120, this.colWd + (zoom === '+' ? 8 : -8)));
        this.render();
      });
    });
  }

  private setupListeners(): void {
    this.setupBarListeners();
    this.setupRowLabelListeners();
    this.setupTrackListeners();
  }

  private setupBarListeners(): void {
    const bars = this.shadowRoot!.querySelectorAll('.bar');
    bars.forEach(bar => {
      const el = bar as HTMLElement;
      el.addEventListener('mousedown', (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        if (relX < 10) {
          this.resizeHandle = { task: el.dataset.bar!, side: 'left' };
        } else if (relX > rect.width - 10) {
          this.resizeHandle = { task: el.dataset.bar!, side: 'right' };
        }
        if (this.resizeHandle) {
          e.preventDefault();
          e.stopPropagation();
          this.ensureDocListeners();
        }
      });
    });
  }

  private setupRowLabelListeners(): void {
    const rowLabels = this.shadowRoot!.querySelectorAll('.row-label');
    rowLabels.forEach(label => {
      const el = label as HTMLElement;
      el.addEventListener('mousedown', (e) => {
        const rowIdx = parseInt(el.dataset.row || '-1', 10);
        if (rowIdx < 0) return;
        this.reorderHandle = { task: this.tasks[rowIdx]?.id || '', startY: e.clientY, fromIndex: rowIdx };
        this.reorderTarget = -1;
        e.preventDefault();
        this.ensureDocListeners();
      });
    });
  }

  private setupTrackListeners(): void {
    const tracks = this.shadowRoot!.querySelectorAll('.row-track');
    tracks.forEach(track => {
      const el = track as HTMLElement;
      el.addEventListener('mousedown', (e) => {
        const bar = (e.target as HTMLElement).closest('.bar');
        if (bar) {
          const barEl = bar as HTMLElement;
          this.moveHandle = { task: barEl.dataset.bar!, startX: e.clientX };
          e.preventDefault();
          this.ensureDocListeners();
          return;
        }
        const scrollContainer = this.shadowRoot!.querySelector('.scroll-container') as HTMLElement;
        if (scrollContainer) {
          this.panHandle = { startX: e.clientX, scrollLeft: scrollContainer.scrollLeft };
          this.shadowRoot!.querySelectorAll('.row-track').forEach(t => t.classList.add('panning'));
          e.preventDefault();
          this.ensureDocListeners();
        }
      });
    });
  }

  private ensureDocListeners(): void {
    this.cleanupListeners();
    this._onMove = (e: MouseEvent) => this.onMove(e);
    this._onUp = () => this.onUp();
    document.addEventListener('mousemove', this._onMove);
    document.addEventListener('mouseup', this._onUp, { once: true });
  }

  private onMove(e: MouseEvent): void {
    if (this.resizeHandle) this.handleResizeMove(e);
    else if (this.moveHandle) this.handleMoveMove(e);
    else if (this.reorderHandle) this.handleReorderMove(e);
    else if (this.panHandle) this.handlePanMove(e);
  }

  private handleResizeMove(e: MouseEvent): void {
    const task = this.tasks.find(t => t.id === this.resizeHandle!.task);
    if (!task) return;
    const ganttEl = this.shadowRoot!.querySelector('.gantt');
    if (!ganttEl) return;
    const rect = ganttEl.getBoundingClientRect();
    const px = e.clientX - rect.left - 140;
    const days = px / this.colWd;
    const ms = this.start.getTime() + days * 86400000;
    if (this.resizeHandle!.side === 'left') task.start = new Date(ms);
    else task.end = new Date(ms);
    if (task.start >= task.end) task.start = new Date(task.end.getTime() - 86400000);

    const left = Math.max(0, this.dayOffset(task.start) * this.colWd);
    const w = Math.max(24, this.dayOffset(task.end) * this.colWd - left);
    const barEl = this.shadowRoot!.querySelector(`[data-bar="${task.id}"]`) as HTMLElement;
    if (barEl) {
      barEl.style.left = `${left}px`;
      barEl.style.width = `${w}px`;
    }
  }

  private handleMoveMove(e: MouseEvent): void {
    const task = this.tasks.find(t => t.id === this.moveHandle!.task);
    if (!task) return;
    const deltaX = e.clientX - this.moveHandle!.startX;
    const deltaDays = deltaX / this.colWd;
    const msShift = Math.round(deltaDays) * 86400000;
    task.start = new Date(task.start.getTime() + msShift);
    task.end = new Date(task.end.getTime() + msShift);
    this.moveHandle!.startX = e.clientX;

    const left = Math.max(0, this.dayOffset(task.start) * this.colWd);
    const w = Math.max(24, this.dayOffset(task.end) * this.colWd - left);
    const barEl = this.shadowRoot!.querySelector(`[data-bar="${task.id}"]`) as HTMLElement;
    if (barEl) {
      barEl.style.left = `${left}px`;
      barEl.style.width = `${w}px`;
    }
  }

  private handleReorderMove(e: MouseEvent): void {
    if (!this.reorderHandle) return;
    const deltaY = e.clientY - this.reorderHandle.startY;
    const targetIndex = Math.max(0, Math.min(this.tasks.length - 1,
      Math.round(deltaY / 36 + this.reorderHandle.fromIndex)));

    const rows = this.shadowRoot!.querySelectorAll('.row');
    rows.forEach((r, i) => {
      r.classList.remove('reorder-target', 'reorder-before');
      if (i === targetIndex) {
        r.classList.add(targetIndex < this.reorderHandle!.fromIndex ? 'reorder-before' : 'reorder-target');
      }
    });
    this.reorderTarget = targetIndex;
  }

  private handlePanMove(e: MouseEvent): void {
    if (!this.panHandle) return;
    const dx = this.panHandle.startX - e.clientX;
    const scrollContainer = this.shadowRoot!.querySelector('.scroll-container') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.scrollLeft = this.panHandle.scrollLeft + dx;
    }
  }

  private onUp(): void {
    if (this.resizeHandle) {
      const task = this.tasks.find(t => t.id === this.resizeHandle!.task);
      if (task) {
        this.dispatchEvent(new CustomEvent(UX_EVENT, {
          bubbles: true, composed: true,
          detail: { action: 'GANTT:RESIZE', task: task.id, start: task.start.toISOString(), end: task.end.toISOString() },
        }));
      }
      this.resizeHandle = null;
    }
    if (this.moveHandle) {
      const task = this.tasks.find(t => t.id === this.moveHandle!.task);
      if (task) {
        this.dispatchEvent(new CustomEvent(UX_EVENT, {
          bubbles: true, composed: true,
          detail: { action: 'GANTT:MOVE', task: task.id, start: task.start.toISOString(), end: task.end.toISOString() },
        }));
      }
      this.moveHandle = null;
    }
    if (this.reorderHandle && this.reorderTarget >= 0 && this.reorderTarget !== this.reorderHandle.fromIndex) {
      this.dispatchEvent(new CustomEvent(UX_EVENT, {
        bubbles: true, composed: true,
        detail: { action: 'GANTT:REORDER', task: this.reorderHandle.task, fromIndex: this.reorderHandle.fromIndex, toIndex: this.reorderTarget },
      }));
    }
    this.reorderHandle = null;
    this.reorderTarget = -1;
    this.panHandle = null;
    this.shadowRoot!.querySelectorAll('.row').forEach(r => r.classList.remove('reorder-target', 'reorder-before'));
    this.shadowRoot!.querySelectorAll('.row-track').forEach(t => t.classList.remove('panning'));
  }

  private dayOffset(date: Date): number {
    return (date.getTime() - this.start.getTime()) / 86400000;
  }
}

interface GanttData {
  tasks: { id: string; label: string; start: string; end: string; progress?: number; dependencies?: string[] }[];
}
