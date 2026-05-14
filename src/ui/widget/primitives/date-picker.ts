import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-date-picker-style';
const STYLE_CSS = `
  ux-date-picker { display: inline-block; position: relative; }
  ux-date-picker .dp-wrapper { display: flex; align-items: center; }
  ux-date-picker .dp-input {
    width: 100%; padding: 0.5rem 0.75rem;
    border: 1px solid var(--dp-border, #d1d5db);
    border-radius: 0.375rem; font: inherit;
    color: var(--dp-text, #0f172a);
    background: var(--dp-bg, #fff);
    box-sizing: border-box; cursor: pointer;
  }
  ux-date-picker .dp-input:focus {
    outline: none; border-color: var(--dp-focus-border, #3b82f6);
    box-shadow: 0 0 0 2px var(--dp-focus-ring, rgba(59,130,246,0.15));
  }
  ux-date-picker .dp-input:disabled {
    opacity: 0.5; cursor: not-allowed; background: var(--dp-disabled-bg, #f9fafb);
  }
  ux-date-picker .dp-calendar {
    display: none; position: absolute; top: 100%; left: 0; z-index: 50;
    margin-top: 0.25rem; background: var(--dp-cal-bg, #fff);
    border: 1px solid var(--dp-border, #d1d5db);
    border-radius: 0.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    padding: 0.75rem; min-width: 280px; user-select: none;
  }
  ux-date-picker .dp-calendar.open { display: block; }
  ux-date-picker .dp-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 0.5rem; font-weight: 600;
  }
  ux-date-picker .dp-header button {
    background: none; border: none; cursor: pointer;
    padding: 0.25rem 0.5rem; border-radius: 0.25rem;
    font-size: 1rem; color: var(--dp-nav-color, #6b7280);
  }
  ux-date-picker .dp-header button:hover { background: var(--dp-hover-bg, #f3f4f6); }
  ux-date-picker .dp-header button:disabled { opacity: 0.3; cursor: default; }
  ux-date-picker .dp-weekdays {
    display: grid; grid-template-columns: repeat(7, 1fr);
    text-align: center; font-size: 0.75rem; color: var(--dp-weekday-color, #9ca3af);
    margin-bottom: 0.25rem;
  }
  ux-date-picker .dp-grid {
    display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
  }
  ux-date-picker .dp-day {
    aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
    font-size: 0.8125rem; border-radius: 0.25rem; cursor: pointer;
    color: var(--dp-day-color, #334155);
  }
  ux-date-picker .dp-day:hover { background: var(--dp-hover-bg, #f3f4f6); }
  ux-date-picker .dp-day.other-month { color: var(--dp-other-color, #d1d5db); }
  ux-date-picker .dp-day.today { font-weight: 700; border: 1px solid var(--dp-today-border, #93c5fd); }
  ux-date-picker .dp-day.selected { background: var(--dp-selected-bg, #3b82f6); color: #fff; }
  ux-date-picker .dp-day.selected:hover { background: var(--dp-selected-hover, #2563eb); }
  ux-date-picker .dp-day.disabled { color: var(--dp-disabled-color, #d1d5db); cursor: not-allowed; pointer-events: none; }
  ux-date-picker[data-variant="compact"] .dp-input { padding: 0.375rem 0.625rem; font-size: 0.875rem; }
`;
registerLightStyle(STYLE_ID, STYLE_CSS);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export class UxDatePicker extends UxBase {
  private input: HTMLInputElement | null = null;
  private calendar: HTMLDivElement | null = null;
  private _built = false;
  private _viewDate: Date = new Date();
  private _selectedDate: Date | null = null;

  static get observedAttributes(): string[] {
    return ['value', 'min', 'max', 'name', 'disabled', 'format'];
  }

  protected onConnected(): void {
    super.onConnected();
    if (!this._built) {
      this._built = true;
      this.build();
    }
  }

  private build(): void {
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'dp-input';
    this.input.readOnly = true;
    this.input.setAttribute('placeholder', this.getAttribute('format') || 'YYYY-MM-DD');
    this.input.setAttribute('autocomplete', 'off');

    const value = this.getAttribute('value');
    if (value) {
      const d = this.parseDate(value);
      if (d) { this._selectedDate = d; this._viewDate = new Date(d); this.updateInput(); }
    }
    if (!this._selectedDate) this._viewDate = new Date();
    if (this.hasAttribute('disabled')) this.input.disabled = true;

    this.appendChild(this.input);

    this.calendar = document.createElement('div');
    this.calendar.className = 'dp-calendar';
    this.appendChild(this.calendar);

    this.input.addEventListener('click', () => this.toggle());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.close(); }
      if (e.key === 'ArrowDown' || e.key === 'Enter') { this.open(); }
    });

    this.renderCalendar();
    this.updateInput();

    document.addEventListener('click', this.onDocClick);
  }

  protected onAttributeChanged(name: string, _ov: string | null, nv: string | null): void {
    if (name === 'value' && nv !== null) {
      const d = this.parseDate(nv);
      if (d) { this._selectedDate = d; this._viewDate = new Date(d); this.updateInput(); this.renderCalendar(); }
    }
    if (name === 'disabled' && this.input) {
      this.input.disabled = nv !== null;
    }
  }

  protected onDisconnected(): void {
    document.removeEventListener('click', this.onDocClick);
    super.onDisconnected();
  }

  private readonly onDocClick = (e: MouseEvent): void => {
    if (!this.calendar || !this.contains(e.target as Node)) {
      this.close();
    }
  };

  private toggle(): void {
    this.calendar?.classList.contains('open') ? this.close() : this.open();
  }

  private open(): void {
    this.calendar?.classList.add('open');
    if (this._selectedDate) this._viewDate = new Date(this._selectedDate);
    this.renderCalendar();
  }

  private close(): void {
    this.calendar?.classList.remove('open');
  }

  private updateInput(): void {
    if (!this.input) return;
    this.input.value = this._selectedDate
      ? this.formatDate(this._selectedDate)
      : '';
  }

  private formatDate(d: Date): string {
    const fmt = this.getAttribute('format') || 'YYYY-MM-DD';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return fmt.replace('YYYY', String(y)).replace('MM', m).replace('DD', day);
  }

  private parseDate(str: string): Date | null {
    if (!str) return null;
    const d = new Date(str);
    if (isNaN(d.getTime())) {
      const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(parseInt(m[1]!), parseInt(m[2]!) - 1, parseInt(m[3]!));
    }
    return isNaN(d.getTime()) ? null : d;
  }

  private renderCalendar(): void {
    if (!this.calendar) return;
    const year = this._viewDate.getFullYear();
    const month = this._viewDate.getMonth();
    const today = new Date();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const min = this.parseDate(this.getAttribute('min') || '');
    const max = this.parseDate(this.getAttribute('max') || '');

    const isDisabled = (d: Date): boolean => {
      if (this.hasAttribute('disabled')) return true;
      if (min && d < min) return true;
      if (max && d > max) return true;
      return false;
    };

    const prevDisabled = this._isPrevMonthDisabled(min, max);
    const nextDisabled = this._isNextMonthDisabled(min, max);

    let html = `<div class="dp-header">
      <button class="dp-prev"${prevDisabled ? ' disabled' : ''}>&lsaquo;</button>
      <span>${MONTHS[month]} ${year}</span>
      <button class="dp-next"${nextDisabled ? ' disabled' : ''}>&rsaquo;</button>
    </div>`;

    html += '<div class="dp-weekdays">';
    for (const wd of WEEKDAYS) html += `<span>${wd}</span>`;
    html += '</div><div class="dp-grid">';

    for (let i = firstDay - 1; i >= 0; i--) {
      html += `<div class="dp-day other-month">${prevMonthDays - i}</div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const sameDay = date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate();

      let cls = 'dp-day';
      if (sameDay) cls += ' today';
      if (this._selectedDate && this.isSameDay(date, this._selectedDate)) cls += ' selected';
      if (isDisabled(date)) cls += ' disabled';

      html += `<div class="${cls}" data-day="${d}">${d}</div>`;
    }

    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
    for (let d = 1; d <= remaining; d++) {
      html += `<div class="dp-day other-month">${d}</div>`;
    }

    html += '</div>';
    this.calendar.innerHTML = html;

    this.calendar.querySelector('.dp-prev')?.addEventListener('click', () => this.goMonth(-1));
    this.calendar.querySelector('.dp-next')?.addEventListener('click', () => this.goMonth(1));
    this.calendar.querySelectorAll('.dp-day:not(.other-month):not(.disabled)').forEach(day => {
      day.addEventListener('click', () => {
        const d = parseInt((day as HTMLElement).dataset.day!, 10);
        this.selectDate(new Date(year, month, d));
      });
    });
  }

  private goMonth(delta: number): void {
    this._viewDate.setMonth(this._viewDate.getMonth() + delta);
    this.renderCalendar();
  }

  private selectDate(d: Date): void {
    this._selectedDate = d;
    const value = this.formatDate(d);
    this.setAttribute('value', value);
    this.updateInput();
    this.close();
    this.renderCalendar();
    this.dispatchEvent(new CustomEvent('ux:date.select', {
      bubbles: true, composed: true,
      detail: { action: 'SELECT', value, date: d },
    }));
    this.dispatchEvent(new CustomEvent('ux:input.change', {
      bubbles: true,
      detail: { value },
    }));
  }

  private _isPrevMonthDisabled(min: Date | null, _max: Date | null): boolean {
    if (!min) return false;
    const prev = new Date(this._viewDate.getFullYear(), this._viewDate.getMonth(), 0);
    return prev < min;
  }

  private _isNextMonthDisabled(_min: Date | null, max: Date | null): boolean {
    if (!max) return false;
    const next = new Date(this._viewDate.getFullYear(), this._viewDate.getMonth() + 1, 1);
    return next > max;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }
}
