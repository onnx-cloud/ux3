import { UxBase } from './base.js';

interface GanttTask { id: string; label: string; start: Date; end: Date; }

export class UxGantt extends UxBase {
  private tasks: GanttTask[] = [];
  private start: Date = new Date();
  private end: Date = new Date();
  private resizeHandle: { task: string; side: 'left' | 'right'; el: HTMLElement } | null = null;
  private _onMove: ((e: MouseEvent) => void) | null = null;
  private _onUp: (() => void) | null = null;
  private _built = false;
  private totalDays = 60;

  protected onConnected(): void {
    super.onConnected();
    this.tasks = Array.from(this.querySelectorAll('[data-task]')).map(el => ({
      id: (el as HTMLElement).dataset.task!,
      label: (el as HTMLElement).dataset.label || (el as HTMLElement).dataset.task!,
      start: new Date((el as HTMLElement).dataset.start || Date.now()),
      end: new Date((el as HTMLElement).dataset.end || Date.now() + 86400000 * 3),
    }));
    if (this.tasks.length) {
      this.start = new Date(Math.min(...this.tasks.map(t => t.start.getTime())));
      this.end = new Date(Math.max(...this.tasks.map(t => t.end.getTime())));
    }
    if (!this._built) {
      this._built = true;
      this.attachShadow({ mode: 'open' });
    }
    this.render();
  }

  protected onDisconnected(): void {
    if (this._onMove) { document.removeEventListener('mousemove', this._onMove); this._onMove = null; }
    if (this._onUp) { document.removeEventListener('mouseup', this._onUp); this._onUp = null; }
    this.resizeHandle = null;
    super.onDisconnected();
  }

  private render(): void {
    const colWd = 24;
    const totalDays = Math.max(1, Math.ceil((this.end.getTime() - this.start.getTime()) / 86400000));
    this.totalDays = totalDays;

    let header = '';
    const cur = new Date(this.start);
    while (cur <= this.end) {
      header += `<div class="day-cell">${cur.getDate()}/${cur.getMonth() + 1}</div>`;
      cur.setDate(cur.getDate() + 1);
    }

    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; overflow-x: auto; }
        .gantt { display: flex; flex-direction: column; min-width: ${totalDays * colWd}px; }
        .header-row { display: flex; border-bottom: 1px solid var(--ux-gantt-border, #d1d5db); position: sticky; top: 0; background: var(--ux-gantt-bg, #fff); }
        .day-cell { flex: 0 0 ${colWd}px; padding: 4px 2px; font-size: 0.625rem; text-align: center; border-right: 1px solid var(--ux-gantt-grid, #f3f4f6); }
        .row { display: flex; align-items: center; border-bottom: 1px solid var(--ux-gantt-grid, #f3f4f6); position: relative; height: 36px; }
        .row-label { flex: 0 0 120px; padding: 0 0.5rem; font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .row-track { flex: 1; position: relative; height: 100%; }
        .bar {
          position: absolute; top: 6px; height: 24px;
          background: var(--ux-gantt-bar, #3b82f6);
          border-radius: 4px; cursor: pointer;
          display: flex; align-items: center; padding: 0 4px; font-size: 0.625rem; color: white; overflow: hidden;
          min-width: 24px;
        }
        .bar::before, .bar::after { content: ''; position: absolute; top: 0; width: 6px; height: 100%; cursor: col-resize; }
        .bar::before { left: 0; }
        .bar::after { right: 0; }
        .bg-grid { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; }
        .bg-day { flex: 0 0 ${colWd}px; border-right: 1px solid var(--ux-gantt-grid, #f3f4f6); }
      </style>
      <div class="gantt">
        <div class="header-row">${header}</div>
        ${this.tasks.map(t => {
          const left = (t.start.getTime() - this.start.getTime()) / 86400000 * colWd;
          const w = Math.max(24, (t.end.getTime() - t.start.getTime()) / 86400000 * colWd);
          return `<div class="row">
            <div class="row-label">${t.label}</div>
            <div class="row-track">
              <div class="bg-grid">${Array(Math.ceil(totalDays)).fill(0).map(() => '<div class="bg-day"></div>').join('')}</div>
              <div class="bar" data-bar="${t.id}" style="left:${left}px;width:${w}px">${t.label}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;

    this.setupBarListeners();
  }

  private setupBarListeners(): void {
    this.shadowRoot!.querySelectorAll('.bar').forEach(bar => {
      const el = bar as HTMLElement;
      el.addEventListener('mousedown', (e) => {
        const rect = el.getBoundingClientRect();
        const side = e.clientX - rect.left < 8 ? 'left' : 'right';
        this.resizeHandle = { task: el.dataset.bar!, side, el };
        e.preventDefault();
      });
    });

    if (this._onUp) { document.removeEventListener('mouseup', this._onUp); }
    if (this._onMove) { document.removeEventListener('mousemove', this._onMove); }

    const colWd = 24;

    this._onMove = (e: MouseEvent) => {
      if (!this.resizeHandle) return;
      const task = this.tasks.find(t => t.id === this.resizeHandle!.task);
      if (!task) return;
      const ganttEl = this.shadowRoot!.querySelector('.gantt');
      if (!ganttEl) return;
      const rect = ganttEl.getBoundingClientRect();
      const px = e.clientX - rect.left - 120;
      const days = px / colWd;
      const ms = this.start.getTime() + days * 86400000;
      if (this.resizeHandle.side === 'left') task.start = new Date(ms);
      else task.end = new Date(ms);

      // Update bar position without full rebuild
      const left = (task.start.getTime() - this.start.getTime()) / 86400000 * colWd;
      const w = Math.max(24, (task.end.getTime() - task.start.getTime()) / 86400000 * colWd);
      const barEl = this.shadowRoot!.querySelector(`[data-bar="${task.id}"]`) as HTMLElement;
      if (barEl) {
        barEl.style.left = `${left}px`;
        barEl.style.width = `${w}px`;
      }
    };

    this._onUp = () => {
      if (this.resizeHandle) {
        this.dispatchEvent(new CustomEvent('ux:event', {
          bubbles: true, composed: true,
          detail: { action: 'RESIZE', task: this.resizeHandle.task },
        }));
      }
      this.resizeHandle = null;
    };

    document.addEventListener('mousemove', this._onMove);
    document.addEventListener('mouseup', this._onUp, { once: true });
  }
}
