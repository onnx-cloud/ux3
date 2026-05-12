import { UxBase } from '../../../../src/ui/widget/primitives/base';
import { escapeHtml } from '@ux3/security/sanitizer';

export class UxCalendar extends UxBase {
  private current: Date = new Date();
  private view: 'month' | 'week' | 'day' = 'month';
  private events: Array<{ date: string; title: string }> = [];

  protected applyData(data: Array<{ date: string; title: string }>): void {
    this.events = data || [];
    if (this.isConnected) this.render();
  }

  protected onConnected(): void {
    super.onConnected();
    const va = this.getAttribute('view') as 'month' | 'week' | 'day' | null;
    if (va && ['month', 'week', 'day'].includes(va)) this.view = va;
    const da = this.getAttribute('date');
    if (da) { const p = new Date(da); if (!isNaN(p.getTime())) this.current = p; }

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; min-height: 280px; }
        .header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; gap: 0.5rem; }
        .header h3 { margin: 0; white-space: nowrap; }
        .nav { display: flex; gap: 0.25rem; }
        .nav button { padding: 0.25rem 0.5rem; border: 1px solid var(--ux-cal-border, #d1d5db); background: var(--ux-cal-bg, #fff); border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem; }
        .nav button.active { background: var(--ux-cal-today, #dbeafe); font-weight: 600; }
        .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--ux-cal-border, #d1d5db); }
        .day-header { background: var(--ux-cal-bg, #fff); padding: 0.5rem; text-align: center; font-weight: 600; font-size: 0.75rem; }
        .day { background: var(--ux-cal-bg, #fff); padding: 0.5rem; min-height: 80px; cursor: pointer; font-size: 0.875rem; }
        .day:hover { background: var(--ux-cal-hover, #f3f4f6); }
        .day.other { color: var(--ux-cal-other, #d1d5db); }
        .day.today { background: var(--ux-cal-today, #dbeafe); font-weight: 600; }
        .day .event { font-size: 0.625rem; background: var(--ux-cal-event, #dbeafe); border-radius: 2px; padding: 1px 4px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .week-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--ux-cal-border, #d1d5db); min-height: 200px; }
        .week-day { background: var(--ux-cal-bg, #fff); padding: 0.5rem; cursor: pointer; font-size: 0.875rem; display: flex; flex-direction: column; gap: 2px; }
        .week-day.today { background: var(--ux-cal-today, #dbeafe); font-weight: 600; }
        .day-single { background: var(--ux-cal-bg, #fff); padding: 1rem; min-height: 200px; text-align: center; font-size: 1.25rem; border: 1px solid var(--ux-cal-border, #d1d5db); border-radius: 0.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; }
        .day-single.today { background: var(--ux-cal-today, #dbeafe); }
      </style>
      <div class="header">
        <slot name="controls">
          <div class="nav">
            <button data-action="PREV">&lt;</button>
            <button data-action="TODAY">Today</button>
            <button data-action="NEXT">&gt;</button>
          </div>
        </slot>
        <h3 class="title"></h3>
        <div class="nav">
          <button data-action="MONTH">Month</button>
          <button data-action="WEEK">Week</button>
          <button data-action="DAY">Day</button>
        </div>
      </div>
      <div class="grid"></div>
    `;

    this.shadowRoot!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action]');
      if (btn) {
        const action = btn.getAttribute('data-action')!;
        if (action === 'PREV') this.navigate(-1);
        else if (action === 'NEXT') this.navigate(1);
        else if (action === 'TODAY') { this.current = new Date(); this.render(); }
        else if (action === 'MONTH' || action === 'WEEK' || action === 'DAY') {
          this.view = action.toLowerCase() as 'month' | 'week' | 'day';
          this.render();
        }
        this.dispatchEvent(new CustomEvent('ux:calendar.event', { bubbles: true, composed: true, detail: { action } }));
        return;
      }
      const dayEl = (e.target as HTMLElement).closest('.day, .week-day, .day-single');
      if (dayEl) {
        const date = dayEl.getAttribute('data-date');
        if (date) {
          this.dispatchEvent(new CustomEvent('ux:calendar.event', {
            bubbles: true, composed: true,
            detail: { action: 'SELECT', date },
          }));
        }
      }
    });
    this.render();
  }

  private navigate(dir: number): void {
    if (this.view === 'month') this.current.setMonth(this.current.getMonth() + dir);
    else if (this.view === 'week') this.current.setDate(this.current.getDate() + dir * 7);
    else this.current.setDate(this.current.getDate() + dir);
    this.render();
  }

  private render(): void {
    const vbs = this.shadowRoot!.querySelectorAll('[data-action="MONTH"],[data-action="WEEK"],[data-action="DAY"]');
    vbs.forEach(b => {
      (b as HTMLElement).classList.toggle('active', b.getAttribute('data-action')?.toLowerCase() === this.view);
    });

    if (this.view === 'month') this.renderMonth();
    else if (this.view === 'week') this.renderWeek();
    else this.renderDay();
  }

  private renderMonth(): void {
    const y = this.current.getFullYear(), m = this.current.getMonth();
    const title = this.shadowRoot!.querySelector('.title') as HTMLElement;
    const grid = this.shadowRoot!.querySelector('.grid') as HTMLElement;
    const mos = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    title.textContent = `${mos[m]} ${y}`;
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--ux-cal-border,#d1d5db);';
    grid.innerHTML = days.map(d => `<div class="day-header">${d}</div>`).join('');

    const fd = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const pd = new Date(y, m, 0).getDate();
    const today = new Date().toDateString();

    for (let i = fd - 1; i >= 0; i--) grid.innerHTML += `<div class="day other">${pd - i}</div>`;
    for (let d = 1; d <= dim; d++) {
      const ds = new Date(y, m, d).toDateString();
      const iso = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const evs = this.events.filter(e => e.date === iso).map(e => `<div class="event">${escapeHtml(e.title)}</div>`).join('');
      grid.innerHTML += `<div class="day${ds === today ? ' today' : ''}" data-date="${iso}">${d}${evs}</div>`;
    }
    const rem = 42 - (fd + dim);
    for (let d = 1; d <= rem; d++) grid.innerHTML += `<div class="day other">${d}</div>`;
  }

  private renderWeek(): void {
    const y = this.current.getFullYear(), m = this.current.getMonth(), d = this.current.getDate();
    const day = this.current.getDay();
    const ws = new Date(y, m, d - day);
    const we = new Date(ws.getTime() + 6 * 86400000);
    const mos = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const title = this.shadowRoot!.querySelector('.title')!;
    title.textContent = `${mos[ws.getMonth()]} ${ws.getDate()} – ${mos[we.getMonth()]} ${we.getDate()}, ${y}`;

    const grid = this.shadowRoot!.querySelector('.grid') as HTMLElement;
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--ux-cal-border,#d1d5db);min-height:200px';
    grid.innerHTML = days.map(dh => `<div class="day-header">${dh}</div>`).join('');

    const today = new Date().toDateString();
    for (let i = 0; i < 7; i++) {
      const date = new Date(ws.getTime() + i * 86400000);
      const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const isT = date.toDateString() === today;
      const evs = this.events.filter(e => e.date === iso).map(e => `<div class="event">${escapeHtml(e.title)}</div>`).join('');
      grid.innerHTML += `<div class="day${isT ? ' today' : ''}" data-date="${iso}">${date.getDate()}${evs}</div>`;
    }
  }

  private renderDay(): void {
    const y = this.current.getFullYear(), m = this.current.getMonth(), d = this.current.getDate();
    const mos = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const title = this.shadowRoot!.querySelector('.title')!;
    title.textContent = `${days[this.current.getDay()]}, ${mos[m]} ${d}, ${y}`;

    const grid = this.shadowRoot!.querySelector('.grid')!;
    grid.style.cssText = 'display:block;';
    const today = new Date().toDateString();
    const isT = this.current.toDateString() === today;
    const iso = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs = this.events.filter(e => e.date === iso).map(e => `<div class="event">${escapeHtml(e.title)}</div>`).join('');
    grid.innerHTML = `<div class="day-single${isT ? ' today' : ''}" data-date="${iso}">${d}${evs}</div>`;
  }
}
