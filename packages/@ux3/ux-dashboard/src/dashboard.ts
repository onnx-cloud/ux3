import { UxBase } from '../../../../src/ui/widget/primitives/base';

export class UxDashboard extends UxBase {
  private resizeEl: HTMLElement | null = null;
  private resizeStart = 0;
  private resizeSize = 0;

  protected onConnected(): void {
    super.onConnected();
    const cols = parseInt(this.getAttribute('cols') || '12', 10);
    const rows = this.getAttribute('rows') || 'auto';
    const gap = this.getAttribute('gap') || '1rem';

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          display: grid;
          grid-template-columns: repeat(${cols}, 1fr);
          grid-template-rows: ${rows};
          gap: ${gap};
          min-height: 400px;
        }
        .widget {
          position: relative;
          border: 1px solid var(--ux-dash-border, #e5e7eb);
          border-radius: 0.5rem;
          padding: 0.75rem;
          background: var(--ux-dash-bg, #fff);
          display: flex; flex-direction: column;
        }
        .widget-header { font-weight: 600; font-size: 0.875rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; }
        .widget-body { flex: 1; overflow: auto; }
        .resize-handle {
          position: absolute; right: 0; bottom: 0;
          width: 16px; height: 16px; cursor: nwse-resize;
          background: linear-gradient(135deg, transparent 50%, var(--ux-dash-handle, #d1d5db) 50%);
        }
        ::slotted([data-col-span]) { grid-column: span var(--col-span, 3); }
        ::slotted([data-row-span]) { grid-row: span var(--row-span, 1); }
      </style>
      <slot></slot>
    `;

    // Distribute slotted widgets with resize handles
    const widgets = Array.from(this.querySelectorAll('[data-widget]'));
    for (const widget of widgets) {
      const el = widget as HTMLElement;
      el.classList.add('widget');
      el.draggable = true;
      const handle = document.createElement('div');
      handle.className = 'resize-handle';
      el.appendChild(handle);
      handle.addEventListener('mousedown', (e) => this.startResize(e, el));
    }

    // Drag reorder
    this.addEventListener('dragstart', (e) => {
      const target = (e.target as HTMLElement).closest('[data-widget]') as HTMLElement;
      if (target) e.dataTransfer!.setData('text/plain', target.dataset.widget || '');
    });
    this.addEventListener('dragover', (e) => e.preventDefault());
    this.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('ux:dashboard.reorder', {
        bubbles: true, composed: true,
        detail: { action: 'REORDER', widget: e.dataTransfer!.getData('text/plain') }
      }));
    });
  }

  protected applyData(data: any): void {
    if (data && typeof data === 'object') {
      if ('cols' in data) this.setAttribute('cols', String(data.cols));
      if ('rows' in data) this.setAttribute('rows', String(data.rows));
      if ('gap' in data) this.setAttribute('gap', String(data.gap));
    }
  }

  private startResize(e: MouseEvent, el: HTMLElement): void {
    this.resizeEl = el;
    this.resizeStart = e.clientX;
    this.resizeSize = el.offsetWidth;
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      if (!this.resizeEl) return;
      const dw = ev.clientX - this.resizeStart;
      this.resizeEl.style.setProperty('--col-span', String(Math.max(1, Math.round((this.resizeSize + dw) / 100))));
    };
    const onUp = () => {
      this.resizeEl = null;
      document.removeEventListener('mousemove', onMove);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, { once: true });
  }
}
