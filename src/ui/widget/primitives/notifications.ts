import { UxBase } from './base.js';

const TOAST_TIMEOUTS = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export class UxNotifications extends UxBase {
  private stack!: HTMLDivElement;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private maxStack = 5;

  protected onConnected(): void {
    super.onConnected();
    const position = this.getAttribute('position') || 'top-right';
    this.maxStack = parseInt(this.getAttribute('max-stack') || '5', 10);

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { position: fixed; ${position.includes('top') ? 'top' : 'bottom'}: 1rem; ${position.includes('right') ? 'right' : 'left'}: 1rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem; max-width: 360px; pointer-events: none; }
        .toast {
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex; align-items: flex-start; gap: 0.5rem;
          animation: slideIn 0.2s ease-out;
          border-left: 4px solid;
          pointer-events: auto;
        }
        .toast.exiting { animation: slideOut 0.15s ease-in forwards; }
        .toast.info { border-left-color: #3b82f6; }
        .toast.success { border-left-color: #10b981; }
        .toast.warning { border-left-color: #f59e0b; }
        .toast.error { border-left-color: #ef4444; }
        .msg { flex: 1; font-size: 0.875rem; }
        .msg-title { font-weight: 600; display: block; margin-bottom: 0.125rem; }
        .dismiss { background: none; border: none; cursor: pointer; color: #9ca3af; font-size: 1rem; line-height: 1; padding: 0; flex-shrink: 0; }
        .dismiss:hover { color: #6b7280; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
      </style>
    `;

    this.stack = (this.shadowRoot as unknown) as HTMLDivElement;

    this.addEventListener('ux:widget.event', ((e: CustomEvent) => {
      if (e.detail?.action === 'RECEIVE') {
        this.push(e.detail.message || '', e.detail.type || 'info', e.detail.duration || 4000, e.detail.title);
      }
    }) as EventListener);

    if (this._boundDataRef) {
      this.applyData(this._boundDataRef);
    }
  }

  protected applyData(items: NotificationItem[]): void {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      this.push(item.message, item.type || 'info', 0, item.title);
    }
  }

  push(message: string, type = 'info', duration = 4000, title?: string): void {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="msg">${title ? `<span class="msg-title">${this.escape(title)}</span>` : ''}${this.escape(message)}</span><button class="dismiss">&times;</button>`;
    this.stack.appendChild(toast);

    toast.querySelector('.dismiss')!.addEventListener('click', () => this.removeToast(toast));

    // Enforce max stack
    const toasts = this.stack.querySelectorAll('.toast');
    while (toasts.length > this.maxStack) {
      this.removeToast(toasts[toasts.length - 1] as HTMLElement, true);
    }

    if (duration > 0) {
      const tid = setTimeout(() => this.removeToast(toast), duration);
      TOAST_TIMEOUTS.set(toast, tid);
    }
  }

  private removeToast(toast: HTMLElement, immediate = false): void {
    const tid = TOAST_TIMEOUTS.get(toast);
    if (tid) { clearTimeout(tid); TOAST_TIMEOUTS.delete(toast); }

    if (immediate) {
      toast.remove();
      return;
    }

    toast.classList.add('exiting');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  private escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

interface NotificationItem {
  type?: string;
  title?: string;
  message: string;
  time?: string;
}
