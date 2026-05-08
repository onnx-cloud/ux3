import { UxBase } from './base.js';

export class UxCalendar extends UxBase {
  private current: Date = new Date();
  private view: 'month' | 'week' | 'day' = 'month';

  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display: block; }
        .header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; }
        .header h3 { margin: 0; }
        .nav { display: flex; gap: 0.5rem; }
        .nav button { padding: 0.25rem 0.5rem; border: 1px solid var(--ux-cal-border, #d1d5db); background: var(--ux-cal-bg, #fff); border-radius: 0.25rem; cursor: pointer; }
        .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--ux-cal-border, #d1d5db); }
        .day-header { background: var(--ux-cal-bg, #fff); padding: 0.5rem; text-align: center; font-weight: 600; font-size: 0.75rem; }
        .day { background: var(--ux-cal-bg, #fff); padding: 0.5rem; min-height: 80px; cursor: pointer; font-size: 0.875rem; }
        .day:hover { background: var(--ux-cal-hover, #f3f4f6); }
        .day.other { color: var(--ux-cal-other, #d1d5db); }
        .day.today { background: var(--ux-cal-today, #dbeafe); font-weight: 600; }
        .day .event { font-size: 0.625rem; background: var(--ux-cal-event, #dbeafe); border-radius: 2px; padding: 1px 4px; margin-top: 2px; }
      </style>
      <div class="header">
        <div class="nav">
          <button data-action="PREV">&lt;</button>
          <button data-action="TODAY">Today</button>
          <button data-action="NEXT">&gt;</button>
        </div>
        <h3 class="title"></h3>
        <div class="nav">
          <button data-action="MONTH">Month</button>
          <button data-action="WEEK">Week</button>
          <button data-action="DAY">Day</button>
        </div>
      </div>
      <div class="grid"></div>
    `;

    this.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action]');
      if (btn) {
        const action = btn.getAttribute('data-action')!;
        if (action === 'PREV') { this.current.setMonth(this.current.getMonth() - 1); this.render(); }
        else if (action === 'NEXT') { this.current.setMonth(this.current.getMonth() + 1); this.render(); }
        else if (action === 'TODAY') { this.current = new Date(); this.render(); }
        else if (action === 'MONTH' || action === 'WEEK' || action === 'DAY') {
          this.view = action.toLowerCase() as 'month' | 'week' | 'day'; this.render();
        }
        this.dispatchEvent(new CustomEvent('ux:event', { bubbles: true, composed: true, detail: { action } }));
      }
      const dayEl = (e.target as HTMLElement).closest('.day');
      if (dayEl && !(e.target as HTMLElement).closest('[data-action]')) {
        const date = dayEl.getAttribute('data-date');
        this.dispatchEvent(new CustomEvent('ux:event', {
          bubbles: true, composed: true,
          detail: { action: 'SELECT', date }
        }));
      }
    });
    this.render();
  }

  private render(): void {
    const y = this.current.getFullYear();
    const m = this.current.getMonth();
    const title = this.shadowRoot!.querySelector('.title')!;
    const grid = this.shadowRoot!.querySelector('.grid')!;

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    title.textContent = `${months[m]} ${y}`;

    // Day headers
    grid.innerHTML = days.map(d => `<div class="day-header">${d}</div>`).join('');

    // Month grid
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const today = new Date().toDateString();

    // Prev month days
    for (let i = firstDay - 1; i >= 0; i--) {
      grid.innerHTML += `<div class="day other">${prevDays - i}</div>`;
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(y, m, d).toDateString();
      const isToday = dateStr === today;
      grid.innerHTML += `<div class="day${isToday ? ' today' : ''}" data-date="${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}">${d}</div>`;
    }
    // Next month
    const remaining = 42 - (firstDay + daysInMonth);
    for (let d = 1; d <= remaining; d++) {
      grid.innerHTML += `<div class="day other">${d}</div>`;
    }
  }
}
